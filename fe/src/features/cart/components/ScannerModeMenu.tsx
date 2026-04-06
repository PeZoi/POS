import {
  SCANNER_MODES,
  scannerModeLabel,
  type ScannerModeId,
} from '@/features/cart/scanner-mode'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

export function ScannerModeMenu({
  value,
  onChange,
}: {
  value: ScannerModeId
  onChange: (mode: ScannerModeId) => void
}) {
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const label = scannerModeLabel(value)

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'inline-flex max-w-[min(100%,11rem)] items-center gap-1 rounded-full border border-border bg-muted/70 px-2.5 py-1 pl-3 text-xs font-semibold text-foreground shadow-xs transition',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn('size-3.5 shrink-0 opacity-70 transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <ul
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-44 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
          role="listbox"
        >
          {SCANNER_MODES.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === value}>
              <button
                type="button"
                className={cn(
                  'flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  m.id === value
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-foreground hover:bg-muted/80',
                )}
                onClick={() => {
                  onChange(m.id)
                  setOpen(false)
                }}
              >
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
