import * as React from 'react'

import type { Product } from '@/types/pos'
import { cn } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import { ProductSearch } from '@/features/products/components/ProductSearch'

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
  return (
    <div className="mt-3 w-full px-2">
      <ProductSearch
        value={query}
        onValueChange={setQuery}
        placeholder="Tìm theo tên hoặc barcode…"
        limit={5}
        debounceMs={320}
        inputClassName="h-10 rounded-xl border-border bg-card pl-9 pr-3 shadow-xs"
        onPickProduct={onPickProduct}
        formatVnd={formatVnd}
        rightSlot={
          <button
            type="button"
            onClick={() => onQuickAdd()}
            className={cn(
              'inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition',
              'hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            aria-label="Thêm sản phẩm thủ công không mã vạch và thêm vào giỏ"
            title="Thêm sản phẩm thủ công (không mã vạch — tạo mã nội bộ)"
          >
            <PlusCircle
              className="size-5 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
          </button>
        }
      />
    </div>
  )
}
