import * as React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type ModalSize = 'sm' | 'md' | 'lg'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: ModalSize
}

const sizeClass: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

function useEscapeToClose(open: boolean, onOpenChange: (o: boolean) => void) {
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])
}

/** Khớp lớp phủ với visual viewport (mobile: bàn phím / thanh địa chỉ) để tránh modal bị nhảy, lệch. */
function useVisualViewportFrame(enabled: boolean) {
  const [frame, setFrame] = React.useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  React.useLayoutEffect(() => {
    if (!enabled) {
      setFrame(null)
      return
    }
    const vv = window.visualViewport
    if (!vv) {
      setFrame(null)
      return
    }
    const sync = () => {
      setFrame({
        top: vv.offsetTop,
        left: vv.offsetLeft,
        width: vv.width,
        height: vv.height,
      })
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [enabled])

  return frame
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEscapeToClose(open, onOpenChange)

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const vvFrame = useVisualViewportFrame(open && mounted)

  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const isOutsideContent = React.useCallback((target: EventTarget | null) => {
    const content = contentRef.current
    if (!content || !target || !(target instanceof Node)) return false
    return !content.contains(target)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className={cn('fixed z-50', !vvFrame && 'inset-0')}
      style={
        vvFrame
          ? {
              top: vvFrame.top,
              left: vvFrame.left,
              width: vvFrame.width,
              height: vvFrame.height,
            }
          : undefined
      }
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // Tránh đóng modal ngay ở mousedown: nếu không, modal biến mất trước mouseup
        // và sự kiện sẽ “xuyên” xuống nút/input phía dưới (ghost click).
        if (isOutsideContent(e.target)) e.preventDefault()
      }}
      onClick={(e) => {
        if (!isOutsideContent(e.target)) return
        e.stopPropagation()
        onOpenChange(false)
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 grid place-items-end sm:place-items-center p-0 sm:p-6">
        <div
          ref={contentRef}
          className={cn(
            'w-full bg-background text-foreground shadow-xl border rounded-t-2xl sm:rounded-2xl',
            // Không dùng vh thuần — tránh nhảy khi mobile đổi viewport; % khớp lớp vv
            'max-h-[min(85%,85dvh,40rem)] overflow-y-auto overscroll-contain',
            sizeClass[size],
          )}
        >
          {(title ?? description) && (
            <div className="px-4 pt-4 sm:px-6 sm:pt-6">
              {title && <div className="text-base font-semibold">{title}</div>}
              {description && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {description}
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-4 sm:px-6">{children}</div>

          {footer && (
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">{footer}</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

