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

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 grid place-items-end sm:place-items-center p-0 sm:p-6">
        <div
          className={cn(
            'w-full bg-background text-foreground shadow-xl border rounded-t-2xl sm:rounded-2xl',
            'max-h-[85vh] overflow-auto',
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

