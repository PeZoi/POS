import * as React from 'react'

import { Input } from '@/components/ui/input'
import type { Product } from '@/types/pos'
import { productService } from '@/services/productService'
import { cn } from '@/lib/utils'
import { Loader2, PlusCircle, Search } from 'lucide-react'

const SEARCH_DEBOUNCE_MS = 320

type CartProductSearchProps = {
  onPickProduct: (product: Product) => void
  onQuickAdd: () => void
  formatVnd: (amount: number) => string
}

export function CartProductSearch({
  onPickProduct,
  onQuickAdd,
  formatVnd,
}: CartProductSearchProps) {
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [matches, setMatches] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const requestIdRef = React.useRef(0)

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  React.useEffect(() => {
    if (!debouncedQuery) {
      setMatches([])
      setLoadError(null)
      setLoading(false)
      return
    }

    const id = ++requestIdRef.current
    setLoading(true)
    setLoadError(null)

    productService
      .search(debouncedQuery, 5)
      .then((list) => {
        if (requestIdRef.current !== id) return
        setMatches(list)
        setLoading(false)
      })
      .catch(() => {
        if (requestIdRef.current !== id) return
        setMatches([])
        setLoadError('Không tải được kết quả tìm kiếm.')
        setLoading(false)
      })
  }, [debouncedQuery])

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const trimmed = query.trim()
  const pendingDebounce = trimmed.length > 0 && debouncedQuery !== trimmed
  const showDropdown = open && trimmed.length > 0
  const showLoading = loading || pendingDebounce

  return (
    <div ref={wrapRef} className="relative mt-3 w-full px-2">
      <div className="flex w-full gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={inputRef}
            type="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Tìm theo tên hoặc barcode…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            className="h-10 rounded-xl border-border bg-card pl-9 pr-3 shadow-xs"
            aria-expanded={showDropdown}
            aria-busy={showLoading}
            aria-controls="cart-product-search-listbox"
            aria-autocomplete="list"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onQuickAdd()
            setOpen(false)
          }}
          className={cn(
            'inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition',
            'hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          )}
          aria-label="Thêm sản phẩm thủ công không mã vạch và thêm vào giỏ"
          title="Thêm sản phẩm thủ công (không mã vạch — tạo mã nội bộ)"
        >
          <PlusCircle className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        </button>
      </div>

      {showDropdown && (
        <ul
          id="cart-product-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(40vh,20rem)] overflow-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {showLoading ? (
            <li className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Đang tìm…
            </li>
          ) : loadError ? (
            <li className="rounded-lg px-3 py-3 text-sm text-destructive" role="status">
              {loadError}
            </li>
          ) : matches.length === 0 ? (
            <li className="rounded-lg px-3 py-3 text-sm text-muted-foreground">
              Không có sản phẩm khớp.
            </li>
          ) : (
            matches.map((p) => (
              <li key={p.id} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/80"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPickProduct(p)
                    setQuery('')
                    setDebouncedQuery('')
                    setMatches([])
                    setOpen(false)
                  }}
                >
                  <span className="font-medium leading-snug text-foreground">{p.name}</span>
                  <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatVnd(p.price)}
                  </span>
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
