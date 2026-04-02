import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Product } from '@/types/pos'
import { Separator } from '@/components/ui/separator'

type CartScanListProps = {
  products: Product[]
  onClear: () => void
  onDec: (productId: number) => void
  onInc: (productId: number) => void
  onRemoveLine: (productId: number) => void
  onUpdateUnitPrice: (productId: number, price: number) => void
  formatVnd: (amount: number) => string
}

type CartLine = {
  product: Product
  quantity: number
}

export function CartScanList({
  products,
  onClear,
  onDec,
  onInc,
  onRemoveLine,
  onUpdateUnitPrice,
  formatVnd,
}: CartScanListProps) {
  const [draftPrices, setDraftPrices] = React.useState<Record<number, string>>({})

  const lines = React.useMemo(() => {
    const order: number[] = []
    const map = new Map<number, CartLine>()

    for (const p of products) {
      if (!map.has(p.id)) {
        order.push(p.id)
        map.set(p.id, { product: p, quantity: 1 })
      } else {
        map.get(p.id)!.quantity += 1
      }
    }

    return order.map((id) => map.get(id)!)
  }, [products])

  const getEffectiveUnit = (productId: number, fallback: number) => {
    const raw = draftPrices[productId]
    const digits = raw?.replace(/[^\d]/g, '') ?? ''
    if (!digits.length) return fallback
    const n = Number(digits)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  return (
    <div className="-mt-2 mx-3 md:mx-0 md:mt-0 md:sticky md:top-6">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Giỏ hàng (scan)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={products.length === 0}
            >
              Xoá hết
            </Button>
          </div>
          <div className="text-base text-muted-foreground">
            Danh sách sản phẩm vừa quét (tự tạo nếu chưa có trong DB)
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="py-14 text-center text-base text-muted-foreground">
              Chưa có mã nào — hãy quét để thêm.
            </div>
          ) : (
            <div className="grid gap-2">
              {lines.map((line, idx) => {
                const { product, quantity } = line
                const effectiveUnit = getEffectiveUnit(product.id, product.price)
                const lineTotal = effectiveUnit * quantity
                const draftRaw = draftPrices[product.id]

                return (
                  <div
                    key={product.id}
                    className="rounded-2xl border bg-muted/10 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 relative">
                      <Badge variant="success" className="text-xl font-bold absolute top-[-10px] left-[-10px] size-8 flex items-center justify-center rounded-full" title={`STT: ${idx + 1}`}>
                        {idx + 1}
                      </Badge>
                      <div className="flex items-center justify-end w-full gap-2">
                        <Badge variant="outline" className="text-[11px]">
                          Mã SP: {product.id}
                        </Badge>
                        <Badge
                          variant="muted"
                          className="max-w-[58%] truncate border border-transparent text-[11px] font-mono"
                          title={product.barcode}
                        >
                          {product.barcode}
                        </Badge>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="mt-2 truncate text-base font-semibold leading-snug">
                      {product.name}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {/* Số lượng */}
                      <div className="rounded-xl bg-background/40 p-3">
                        <div className="text-sm font-medium text-muted-foreground">Số lượng</div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-10 rounded-xl px-0 py-0 text-xl touch-manipulation"
                            onClick={() => onDec(product.id)}
                            aria-label="Giảm số lượng"
                          >
                            -
                          </Button>
                          <div className="min-w-12 text-center text-xl font-bold tabular-nums">
                            {quantity}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-10 rounded-xl px-0 py-0 text-xl touch-manipulation"
                            onClick={() => onInc(product.id)}
                            aria-label="Tăng số lượng"
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Đơn giá */}
                      <div className="rounded-xl bg-background/40 p-3">
                        <div className="text-sm font-medium text-muted-foreground">Đơn giá</div>
                        <div className="mt-2 flex items-center justify-end w-full gap-2">
                          <Input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="off"
                            spellCheck={false}
                            className="h-10 w-24 rounded-xl text-center text-xl tabular-nums"
                            value={draftRaw ?? String(product.price)}
                            onChange={(e) => {
                              const next = e.target.value
                              setDraftPrices((prev) => ({ ...prev, [product.id]: next }))
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="mt-2 text-sm font-semibold tabular-nums text-end">
                      <span className="text-muted-foreground">Thành tiền:</span> {formatVnd(lineTotal)}
                    </div>

                    <Separator className="my-3" />

                    <div className="mt-3 flex items-center justify-end w-full gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 flex-1 rounded-xl px-4 text-base"
                        onClick={() => {
                          const raw = draftPrices[product.id]
                          const digits = raw?.replace(/[^\d]/g, '') ?? ''
                          const n = digits.length ? Number(digits) : NaN
                          if (!Number.isFinite(n) || n <= 0) return
                          onUpdateUnitPrice(product.id, n)
                        }}
                      >
                        Cập nhật giá
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-11 flex-1 rounded-xl px-4 text-base"
                        onClick={() => onRemoveLine(product.id)}
                      >
                        Xoá
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

