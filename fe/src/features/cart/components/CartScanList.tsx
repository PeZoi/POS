import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Product } from '@/types/pos'
import { Separator } from '@/components/ui/separator'
import { cartLinesFromProducts } from '@/features/cart/cart-lines'
import { digitsOnly, formatThousandsComma } from '@/utils/priceDigits'
import { ScanLine } from 'lucide-react'

type CartScanListProps = {
  products: Product[]
  draftPrices: Record<number, string>
  onDraftPriceChange: (productId: number, raw: string) => void
  onClear: () => void
  onDec: (productId: number) => void
  onInc: (productId: number) => void
  onRemoveLine: (productId: number) => void
  onUpdateUnitPrice: (productId: number, price: number) => void
  formatVnd: (amount: number) => string
}

export function CartScanList({
  products,
  draftPrices,
  onDraftPriceChange,
  onClear,
  onDec,
  onInc,
  onRemoveLine,
  onUpdateUnitPrice,
  formatVnd,
}: CartScanListProps) {
  const lines = React.useMemo(() => cartLinesFromProducts(products), [products])
  /** Khi focus: hiển thị số thuần để gõ; blur: hiển thị có dấu phẩy ngăn cách. */
  const [priceFocused, setPriceFocused] = React.useState<Record<number, boolean>>({})

  const getEffectiveUnit = (productId: number, fallback: number) => {
    const raw = draftPrices[productId]
    const d = raw !== undefined ? digitsOnly(raw) : ''
    if (!d.length) return fallback
    const n = Number(d)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  return (
    <div className="mx-3 md:mx-0 md:mt-0 md:sticky md:top-6 mt-5">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Giỏ hàng <span className="text-xs text-muted-foreground">{lines.length > 0 ? `(${lines.length} sản phẩm)` : '(Trống)'}</span></CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              disabled={products.length === 0}
            >
              Xoá hết
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
              <div
                className="relative grid size-18 place-items-center rounded-2xl border border-dashed border-muted-foreground/30 bg-linear-to-br from-muted/50 to-muted/20 text-muted-foreground shadow-inner ring-1 ring-border/40"
                aria-hidden
              >
                <ScanLine className="size-9 opacity-90" strokeWidth={1.65} />
              </div>
              <div className="max-w-[28ch] space-y-1.5 text-center">
                <p className="text-base font-medium tracking-tight text-foreground">
                  Chưa có sản phẩm
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Quét mã vạch để thêm vào giỏ hàng
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              {lines.map((line, idx) => {
                const { product, quantity } = line
                const effectiveUnit = getEffectiveUnit(product.id, product.price)
                const lineTotal = effectiveUnit * quantity
                const draftRaw = draftPrices[product.id]
                const focused = priceFocused[product.id] ?? false
                const digitStr =
                  draftRaw !== undefined
                    ? digitsOnly(draftRaw)
                    : String(Math.max(0, Math.floor(Number(product.price))))
                const priceDisplay = focused
                  ? digitStr
                  : formatThousandsComma(digitStr)

                return (
                  <div
                    key={product.id}
                    className="rounded-2xl border bg-muted/10 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 relative">
                      <Badge className="text-md font-bold absolute top-[-5px] left-[-5px] size-6 flex items-center justify-center rounded-full" title={`STT: ${idx + 1}`}>
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
                        <div className="text-sm font-medium text-muted-foreground text-center">Đơn giá</div>
                        <div className="mt-2 flex w-full items-center justify-end gap-2">
                          <Input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="off"
                            spellCheck={false}
                            className="h-10 min-w-0 max-w-full flex-1 rounded-xl text-center text-xl tabular-nums"
                            value={priceDisplay}
                            onChange={(e) => {
                              onDraftPriceChange(product.id, digitsOnly(e.target.value))
                            }}
                            onFocus={() =>
                              setPriceFocused((p) => ({ ...p, [product.id]: true }))
                            }
                            onBlur={() =>
                              setPriceFocused((p) => ({ ...p, [product.id]: false }))
                            }
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
                          const digits = raw !== undefined ? digitsOnly(raw) : ''
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

