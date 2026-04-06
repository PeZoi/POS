import * as React from 'react'

import { cn } from '@/lib/utils'

function shouldMoveCaretToEnd(type?: string) {
  const t = (type ?? 'text').toLowerCase()
  // Những loại input không có caret hoặc không nên đụng selection.
  return ![
    'checkbox',
    'radio',
    'range',
    'color',
    'file',
    'button',
    'submit',
    'reset',
    'hidden',
  ].includes(t)
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, onFocus, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          // text-base (16px): tránh iOS Safari tự zoom khi focus ô nhập
          'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onFocus={(e) => {
          onFocus?.(e)
          if (!shouldMoveCaretToEnd(type)) return
          const el = e.currentTarget
          if (el.readOnly || el.disabled) return
          const len = el.value.length
          // Defer để tránh iOS/Safari ghi đè selection khi focus.
          window.setTimeout(() => {
            try {
              el.setSelectionRange(len, len)
            } catch {
              // ignore
            }
          }, 0)
        }}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }

