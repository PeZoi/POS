import * as React from 'react'

import { Input } from '@/components/ui/input'
import type { Product } from '@/types/pos'
import { productService } from '@/services/productService'
import { cn } from '@/lib/utils'
import { normalizeProductSearchText } from '@/features/products/utils/productSearch'
import { Loader2, Search } from 'lucide-react'

export type ProductSearchState = {
  query: string
  debouncedQuery: string
  loading: boolean
  error: string | null
  results: Product[]
}

export type ProductSearchProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  limit?: number
  debounceMs?: number
  className?: string
  inputClassName?: string
  disabled?: boolean

  /** Optional slot rendered at the right side of input row */
  rightSlot?: React.ReactNode

  /** When provided, component shows dropdown to pick a product */
  onPickProduct?: (product: Product) => void
  formatVnd?: (amount: number) => string

  /** Notify parent with latest loading/error/results */
  onStateChange?: (state: ProductSearchState) => void
}

export function ProductSearch({
  value,
  onValueChange,
  placeholder = 'Tìm theo tên hoặc barcode…',
  limit = 100,
  debounceMs = 320,
  className,
  inputClassName,
  disabled,
  rightSlot,
  onPickProduct,
  formatVnd,
  onStateChange,
}: ProductSearchProps) {
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [results, setResults] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const wrapRef = React.useRef<HTMLDivElement>(null)
  const requestIdRef = React.useRef(0)

  const normalizedValue = React.useMemo(() => normalizeProductSearchText(value), [value])

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(normalizeProductSearchText(value))
    }, debounceMs)
    return () => window.clearTimeout(t)
  }, [value, debounceMs])

  React.useEffect(() => {
    const q = normalizeProductSearchText(debouncedQuery)

    if (!q) {
      setResults([])
      setError(null)
      setLoading(false)
      onStateChange?.({
        query: value,
        debouncedQuery: '',
        loading: false,
        error: null,
        results: [],
      })
      return
    }

    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    onStateChange?.({
      query: value,
      debouncedQuery: q,
      loading: true,
      error: null,
      results,
    })

    productService
      .search(q, limit)
      .then((list) => {
        if (requestIdRef.current !== id) return
        setResults(list)
        setLoading(false)
        setError(null)
        onStateChange?.({
          query: value,
          debouncedQuery: q,
          loading: false,
          error: null,
          results: list,
        })
      })
      .catch(() => {
        if (requestIdRef.current !== id) return
        setResults([])
        setLoading(false)
        setError('Không tải được kết quả tìm kiếm.')
        onStateChange?.({
          query: value,
          debouncedQuery: q,
          loading: false,
          error: 'Không tải được kết quả tìm kiếm.',
          results: [],
        })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, limit])

  React.useEffect(() => {
    if (!onPickProduct) return
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onPickProduct])

  const showDropdown = Boolean(onPickProduct) && open && normalizedValue.length > 0
  const pendingDebounce = normalizedValue.length > 0 && debouncedQuery !== normalizedValue
  const showLoading = loading || pendingDebounce

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)}>
      <div className="flex w-full gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onValueChange(e.target.value)
              if (onPickProduct) setOpen(true)
            }}
            onFocus={() => {
              if (onPickProduct) setOpen(true)
            }}
            className={cn('pl-9', inputClassName)}
            aria-expanded={showDropdown}
            aria-busy={showLoading}
            aria-controls={onPickProduct ? 'product-search-listbox' : undefined}
            aria-autocomplete={onPickProduct ? 'list' : undefined}
          />
        </div>
        {rightSlot}
      </div>

      {showDropdown && (
        <ul
          id="product-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(40vh,20rem)] overflow-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {showLoading ? (
            <li className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Đang tìm…
            </li>
          ) : error ? (
            <li className="rounded-lg px-3 py-3 text-sm text-destructive" role="status">
              {error}
            </li>
          ) : results.length === 0 ? (
            <li className="rounded-lg px-3 py-3 text-sm text-muted-foreground">
              Không có sản phẩm khớp.
            </li>
          ) : (
            results.map((p) => (
              <li key={p.id} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/80"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPickProduct?.(p)
                    onValueChange('')
                    setDebouncedQuery('')
                    setResults([])
                    setOpen(false)
                  }}
                >
                  <span className="font-medium leading-snug text-foreground">{p.name}</span>
                  {formatVnd && (
                    <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatVnd(p.price)}
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">{p.barcode}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

