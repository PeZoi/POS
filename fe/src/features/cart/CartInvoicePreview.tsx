import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCartStore } from '@/features/cart/cart-store'
import { cartLinesFromProducts, effectiveUnitFromDraft } from '@/features/cart/cart-lines'
import { orderService, type OrderItemCreate } from '@/services/orderService'
import { cn } from '@/lib/utils'
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'
import { ArrowLeft, ReceiptText, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'

type PreviewLine = {
  productId: number
  productName: string
  quantityRaw: string
  unitPriceRaw: string
}

function clamp2Class() {
  // Không dùng line-clamp plugin để tránh phụ thuộc; dùng CSS clamp thủ công.
  return 'overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]'
}

function toVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function parsePositiveInt(raw: string, fallback = 1): number {
  const n = Number(digitsOnly(raw))
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

function moveCaretToEndOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  const el = e.currentTarget
  const len = el.value.length
  // Defer để tránh iOS/Safari ghi đè selection khi focus.
  window.setTimeout(() => {
    try {
      el.setSelectionRange(len, len)
    } catch {
      // ignore (some input types may not support selection)
    }
  }, 0)
}

function unitPriceInputValue(raw: string): string {
  if (raw === '') return ''
  return formatThousandsComma(raw)
}

export default function CartInvoicePreview() {
  const navigate = useNavigate()
  const products = useCartStore((s) => s.products)
  const draftPrices = useCartStore((s) => s.draftPrices)
  const clearCart = useCartStore((s) => s.clear)

  const [lines, setLines] = React.useState<PreviewLine[]>(() =>
    cartLinesFromProducts(products).map((line) => ({
      productId: line.product.id,
      productName: line.product.name,
      quantityRaw: String(Math.max(1, Math.floor(line.quantity))),
      unitPriceRaw: String(
        effectiveUnitFromDraft(line.product.id, line.product.price, draftPrices),
      ),
    })),
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const linesRef = React.useRef(lines)
  React.useEffect(() => {
    linesRef.current = lines
  }, [lines])

  const unitPriceSnapRef = React.useRef<Map<number, string>>(new Map())
  const quantitySnapRef = React.useRef<Map<number, string>>(new Map())

  const onUnitPriceFocus = React.useCallback((idx: number, e: React.FocusEvent<HTMLInputElement>) => {
    unitPriceSnapRef.current.set(idx, linesRef.current[idx]?.unitPriceRaw ?? '')
    moveCaretToEndOnFocus(e)
  }, [])

  const onUnitPriceBlur = React.useCallback((idx: number) => {
    setLines((prev) =>
      prev.map((x, i) => {
        if (i !== idx) return x
        const raw = stripLeadingZeros(digitsOnly(x.unitPriceRaw))
        if (raw === '') {
          const snap = unitPriceSnapRef.current.get(idx)
          unitPriceSnapRef.current.delete(idx)
          return { ...x, unitPriceRaw: snap !== undefined ? snap : '0' }
        }
        unitPriceSnapRef.current.delete(idx)
        return { ...x, unitPriceRaw: raw }
      }),
    )
  }, [])

  const onQuantityFocus = React.useCallback((idx: number, e: React.FocusEvent<HTMLInputElement>) => {
    quantitySnapRef.current.set(idx, linesRef.current[idx]?.quantityRaw ?? '1')
    moveCaretToEndOnFocus(e)
  }, [])

  const onQuantityBlur = React.useCallback((idx: number) => {
    setLines((prev) =>
      prev.map((x, i) => {
        if (i !== idx) return x
        const raw = stripLeadingZeros(digitsOnly(x.quantityRaw))
        if (raw === '') {
          const snap = quantitySnapRef.current.get(idx) ?? '1'
          quantitySnapRef.current.delete(idx)
          return { ...x, quantityRaw: snap }
        }
        const n = parsePositiveInt(raw, 0)
        if (n < 1) {
          const snap = quantitySnapRef.current.get(idx) ?? '1'
          quantitySnapRef.current.delete(idx)
          return { ...x, quantityRaw: snap }
        }
        quantitySnapRef.current.delete(idx)
        return { ...x, quantityRaw: String(Math.floor(n)) }
      }),
    )
  }, [])

  React.useEffect(() => {
    // Nếu mở preview mà không có giỏ → quay lại.
    if (products.length === 0) {
      navigate('/cart', { replace: true })
    }
  }, [navigate, products.length])

  // Nếu giỏ thay đổi (hiếm) khi đang ở preview → đồng bộ lại bảng theo giỏ hiện tại.
  React.useEffect(() => {
    setLines(
      cartLinesFromProducts(products).map((line) => ({
        productId: line.product.id,
        productName: line.product.name,
        quantityRaw: String(Math.max(1, Math.floor(line.quantity))),
        unitPriceRaw: String(
          effectiveUnitFromDraft(line.product.id, line.product.price, draftPrices),
        ),
      })),
    )
  }, [draftPrices, products])

  const total = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        const price =
          line.unitPriceRaw === '' ? 0 : parsePositiveInt(line.unitPriceRaw, 0)
        const qty =
          line.quantityRaw === '' ? 0 : parsePositiveInt(line.quantityRaw, 1)
        return sum + price * qty
      }, 0),
    [lines],
  )

  const onConfirm = React.useCallback(async () => {
    if (!lines.length || saving) return
    setError(null)
    setSaving(true)
    try {
      const items: OrderItemCreate[] = lines.map((line) => ({
        productId: line.productId,
        quantity: Math.max(1, Math.floor(parsePositiveInt(line.quantityRaw, 1))),
        unitPrice: parsePositiveInt(line.unitPriceRaw, 0),
      }))
      await orderService.create({
        paymentMethod: null,
        status: 'PENDING',
        items,
      })
      clearCart()
      navigate('/orders')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo hoá đơn.')
    } finally {
      setSaving(false)
    }
  }, [clearCart, lines, navigate, saving])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 px-3 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Quay lại giỏ hàng"
          onClick={() => {
            navigate(-1)
          }}
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Kiểm tra hoá đơn</h1>
          <p className="text-sm text-muted-foreground">Kiểm tra và chỉnh sửa trước khi xác nhận</p>
        </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4">
          <div>
            <div className="flex flex-col gap-1.5 p-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-lg font-semibold leading-none">
                  <ReceiptText className="size-5 text-emerald-600 dark:text-emerald-400" />
                  Chi tiết sản phẩm
                </div>
                <span className="text-sm text-muted-foreground">{lines.length} sản phẩm</span>
              </div>
            </div>
            <Separator className="mt-1 mb-4" />
            <div className="grid gap-3 pt-0">
              {/* Bảng responsive: mobile = 2 hàng / 1 sản phẩm (không scroll ngang), md+ = bảng chuẩn */}
              <div className="rounded-2xl border bg-card">
                <table className="w-full table-fixed text-sm">
                  <thead className="hidden md:table-header-group">
                    <tr className="border-b">
                      <th className="h-11 w-10 px-3 text-center text-xs font-semibold tracking-wide text-muted-foreground">
                        #
                      </th>
                      <th className="h-11 px-3 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                        Sản phẩm
                      </th>
                      <th className="h-11 w-36 px-3 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                        Đơn giá
                      </th>
                      <th className="h-11 w-28 px-3 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                        SL
                      </th>
                      <th className="h-11 w-40 px-3 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                        Thành tiền
                      </th>
                      <th className="h-11 w-14 px-3 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                        Xoá
                      </th>
                    </tr>
                  </thead>

                  <tbody className="[&_tr:last-child]:border-0">
                    {/* Mobile header: chỉ hiện đơn giá / SL / thành tiền */}
                    <tr className="border-b bg-card/95 md:hidden">
                      <td className="p-3" colSpan={4}>
                        <div className="grid grid-cols-3 gap-3 text-xs font-semibold tracking-wide text-muted-foreground">
                          <div className="text-right">Đơn giá</div>
                          <div className="text-right">SL</div>
                          <div className="text-right">Thành tiền</div>
                        </div>
                      </td>
                    </tr>
                    {lines.map((line, idx) => {
                      const unitPrice =
                        line.unitPriceRaw === '' ? 0 : parsePositiveInt(line.unitPriceRaw, 0)
                      const qty =
                        line.quantityRaw === '' ? 0 : parsePositiveInt(line.quantityRaw, 1)
                      const lineTotal = unitPrice * qty

                      return (
                        <React.Fragment key={line.productId}>
                          {/* Mobile: 1 item = 2 dòng (tên 2 lines clamp + dòng detail 3 cột) */}
                          <tr className="md:hidden">
                            <td className="p-3 align-top" colSpan={4}>
                              <div className={cn('text-base font-semibold text-foreground', clamp2Class())}>
                                <span className="text-muted-foreground">{idx + 1}.</span> {line.productName}
                              </div>
                            </td>
                          </tr>

                          <tr className={`md:hidden ${idx !== lines.length - 1 && 'border-b'}`}>
                            <td className="px-3 pb-3" colSpan={4}>
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  value={unitPriceInputValue(line.unitPriceRaw)}
                                  onChange={(e) => {
                                    const raw = stripLeadingZeros(digitsOnly(e.target.value))
                                    setLines((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, unitPriceRaw: raw } : x,
                                      ),
                                    )
                                  }}
                                  inputMode="numeric"
                                  className="h-10 rounded-lg text-right text-base tabular-nums"
                                  aria-label="Đơn giá"
                                  onFocus={(e) => onUnitPriceFocus(idx, e)}
                                  onBlur={() => onUnitPriceBlur(idx)}
                                />
                                <Input
                                  value={line.quantityRaw}
                                  onChange={(e) => {
                                    const raw = stripLeadingZeros(digitsOnly(e.target.value))
                                    setLines((prev) =>
                                      prev.map((x, i) =>
                                        i === idx ? { ...x, quantityRaw: raw } : x,
                                      ),
                                    )
                                  }}
                                  inputMode="numeric"
                                  className="h-10 rounded-lg text-right text-base tabular-nums"
                                  aria-label="Số lượng"
                                  onFocus={(e) => onQuantityFocus(idx, e)}
                                  onBlur={() => onQuantityBlur(idx)}
                                />
                                <div className="flex h-10 items-center justify-end rounded-lg bg-muted/20 px-3 text-right text-sm font-bold tabular-nums text-foreground">
                                  {toVnd(lineTotal)}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Desktop row: bảng chuẩn */}
                          <tr className="hidden border-b transition-colors hover:bg-muted/40 md:table-row">
                            <td className="p-3 align-middle text-center text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="p-3 align-middle">
                              <div className="font-medium">{line.productName}</div>
                            </td>
                            <td className="p-3 align-middle">
                              <Input
                                value={unitPriceInputValue(line.unitPriceRaw)}
                                onChange={(e) => {
                                  const raw = stripLeadingZeros(digitsOnly(e.target.value))
                                  setLines((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, unitPriceRaw: raw } : x)),
                                  )
                                }}
                                inputMode="numeric"
                                className="h-10 rounded-xl text-right tabular-nums"
                                onFocus={(e) => onUnitPriceFocus(idx, e)}
                                onBlur={() => onUnitPriceBlur(idx)}
                              />
                            </td>
                            <td className="p-3 align-middle">
                              <Input
                                value={line.quantityRaw}
                                onChange={(e) => {
                                  const raw = stripLeadingZeros(digitsOnly(e.target.value))
                                  setLines((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, quantityRaw: raw } : x)),
                                  )
                                }}
                                inputMode="numeric"
                                className="h-10 rounded-xl text-right tabular-nums"
                                onFocus={(e) => onQuantityFocus(idx, e)}
                                onBlur={() => onQuantityBlur(idx)}
                              />
                            </td>
                            <td className="p-3 align-middle text-right font-semibold tabular-nums">
                              {toVnd(lineTotal)}
                            </td>
                            <td className="p-3 align-middle text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-10 w-10 p-0"
                                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                                aria-label="Xoá dòng"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </td>
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!lines.length && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Không còn sản phẩm trong hóa đơn. Quay lại giỏ hàng để thêm sản phẩm.
                </div>
              )}

              {error && (
                <div className="rounded-xl border bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-md supports-backdrop-filter:bg-card/90">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 sm:block">
            <div className="text-sm font-medium text-muted-foreground">Tổng thanh toán</div>
            <div className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
              {toVnd(total)}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Quay lại giỏ hàng
            </Button>
            <Button
              onClick={() => void onConfirm()}
              disabled={saving || lines.length === 0}
              className={cn('min-w-40', saving && 'opacity-90')}
            >
              {saving ? 'Đang tạo...' : 'Xác nhận tạo hoá đơn'}
            </Button>
          </div>
        </div>
        <div
          className="h-[env(safe-area-inset-bottom)] min-h-[env(safe-area-inset-bottom)] bg-card/95"
          aria-hidden
        />
      </footer>
    </div>
  )
}
