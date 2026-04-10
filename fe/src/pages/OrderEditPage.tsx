import * as React from 'react'
import { ArrowLeft, ReceiptText, Save } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import type { OrderStatus, Product } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductSearch } from '@/features/products/components/ProductSearch'
import { OrderEditLines } from '@/features/orders/components/OrderEditLines'
import { orderService, type CreateOrderInput } from '@/services/orderService'
import { ApiError } from '@/services/apiClient'
import { cartGrandTotal, cartLinesFromProducts, effectiveUnitFromDraft } from '@/features/cart/cart-lines'
import { digitsOnly, stripLeadingZeros } from '@/utils/priceDigits'
import { Separator } from '@/components/ui/separator'

function toProductForEdit(opts: { id: number; name: string; barcode: string; price: number }): Product {
  return {
    id: opts.id,
    name: opts.name,
    barcode: opts.barcode,
    price: opts.price,
    status: 'ACTIVE',
    isAutoCreated: false,
    isDeleted: false,
  }
}

export function OrderEditPage() {
  const navigate = useNavigate()
  const params = useParams()

  const orderId = React.useMemo(() => {
    const raw = params.id
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }, [params.id])

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [originalPaidAmount, setOriginalPaidAmount] = React.useState<number>(0)

  const [status, setStatus] = React.useState<OrderStatus>('PENDING')
  const [products, setProducts] = React.useState<Product[]>([])
  const [draftPrices, setDraftPrices] = React.useState<Record<number, string>>({})
  const [searchQuery, setSearchQuery] = React.useState('')

  React.useEffect(() => {
    if (!orderId) return
    let alive = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const o = await orderService.getById(orderId)
        if (!alive) return

        const initialStatus = (o.status ?? 'PENDING') as OrderStatus
        setStatus(initialStatus)
        setOriginalPaidAmount(Math.max(0, Math.floor(o.paidAmount ?? 0)))

        const nextDraft: Record<number, string> = {}
        const nextProducts: Product[] = []
        for (const it of o.items ?? []) {
          const unit = Math.max(0, Math.floor(Number(it.price ?? 0)))
          nextDraft[it.productId] = String(unit)
          const p = toProductForEdit({
            id: it.productId,
            name: it.productName,
            barcode: it.barcode,
            price: unit,
          })
          const q = Math.max(0, Math.floor(Number(it.quantity ?? 0)))
          for (let i = 0; i < q; i++) nextProducts.push({ ...p })
        }
        setDraftPrices(nextDraft)
        setProducts(nextProducts)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'Không thể tải hoá đơn.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [orderId])

  const vndFormatter = React.useMemo(
    () => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }),
    [],
  )
  const formatVnd = React.useCallback((amount: number) => vndFormatter.format(amount), [vndFormatter])

  const total = React.useMemo(() => cartGrandTotal(products, draftPrices), [products, draftPrices])

  const onPickProduct = React.useCallback((p: Product) => {
    setProducts((prev) => [p, ...prev])
    setDraftPrices((prev) => (prev[p.id] === undefined ? { ...prev, [p.id]: String(Math.max(0, Math.floor(p.price))) } : prev))
    toast.success(`Đã thêm ${p.name}`, { description: `Giá: ${formatVnd(p.price)}`, duration: 900 })
  }, [formatVnd])

  const onDraftPriceChange = React.useCallback((productId: number, raw: string) => {
    setDraftPrices((s) => ({ ...s, [productId]: raw }))
  }, [])

  const onClear = React.useCallback(() => {
    setProducts([])
  }, [])

  const onDec = React.useCallback((productId: number) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === productId)
      if (idx < 0) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }, [])

  const onInc = React.useCallback((productId: number) => {
    setProducts((prev) => {
      const found = prev.find((p) => p.id === productId)
      if (!found) return prev
      return [...prev, { ...found }]
    })
  }, [])

  const onRemoveLine = React.useCallback((productId: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
  }, [])

  const canSubmit = React.useMemo(() => !loading && !submitting && orderId != null, [loading, submitting, orderId])

  const submit = React.useCallback(async () => {
    if (!orderId) return

    const lines = cartLinesFromProducts(products)
    if (lines.length === 0) {
      globalThis.alert?.('Vui lòng thêm ít nhất 1 sản phẩm.')
      return
    }

    const items: CreateOrderInput['items'] = lines.map((l) => {
      const unit = effectiveUnitFromDraft(l.product.id, l.product.price, draftPrices)
      return { productId: l.product.id, quantity: l.quantity, unitPrice: unit }
    })

    const cleanedDraftPrices: Record<number, string> = {}
    for (const [k, v] of Object.entries(draftPrices)) {
      const pid = Number(k)
      if (!Number.isFinite(pid)) continue
      cleanedDraftPrices[pid] = stripLeadingZeros(digitsOnly(v))
    }
    setDraftPrices(cleanedDraftPrices)

    const paid = Math.max(0, Math.floor(originalPaidAmount))
    const remaining = total - paid

    const computedStatus: OrderStatus =
      status === 'CANCELLED'
        ? 'CANCELLED'
        : remaining > 0
          ? paid > 0
            ? 'PARTIALLY_PAID'
            : 'PENDING'
          : paid > 0
            ? 'PAID'
            : 'PENDING'

    const payload: CreateOrderInput = { status: computedStatus, paidAmount: paid, items }

    setSubmitting(true)
    try {
      await orderService.update(orderId, payload)
      toast.success('Đã lưu hoá đơn', { description: `Tổng tiền: ${formatVnd(total)}` })
      navigate(`/orders/${orderId}`, { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : 'Không thể lưu hoá đơn.'
      globalThis.alert?.(msg)
    } finally {
      setSubmitting(false)
    }
  }, [draftPrices, formatVnd, navigate, orderId, originalPaidAmount, products, status, total])

  if (orderId == null) {
    return (
      <div className="rounded-2xl border bg-destructive/5 p-4 text-sm text-destructive">ID hoá đơn không hợp lệ.</div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 bg-background/95 px-3 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:gap-3 sm:px-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl"
          onClick={() => navigate(`/orders`)}
          aria-label="Quay lại"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-tight">Sửa hoá đơn</h1>
        <Button className="rounded-xl" onClick={submit} disabled={!canSubmit} aria-label="Lưu hoá đơn">
          <Save className="mr-1.5 size-4" />
          Lưu
        </Button>
      </header>

      <Separator className="mb-3" />

      <div className="flex flex-1 flex-col overflow-auto pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        <div className="grid flex-1 gap-2 px-0 md:grid-cols-[1fr_420px] md:items-start md:gap-3 md:px-0">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="mt-3 w-full px-2">
              <ProductSearch
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Tìm theo tên hoặc barcode…"
                limit={5}
                debounceMs={320}
                inputClassName="h-10 rounded-xl border-border bg-card pl-9 pr-3 shadow-xs"
                onPickProduct={onPickProduct}
                formatVnd={formatVnd}
                disabled={loading}
              />
            </div>

            <Card className="mx-3 md:mx-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="size-4 text-muted-foreground" />
                  Thông tin
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {error && (
                  <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
                )}

                <div className="grid gap-2 sm:max-w-xs">
                  <Label id="status-label">Trạng thái</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as OrderStatus)}
                    disabled={loading || submitting}
                  >
                    <SelectTrigger
                      aria-labelledby="status-label"
                      className="h-9 w-full rounded-lg px-3 text-sm shadow-xs"
                    >
                      <SelectValue placeholder="Chọn trạng thái…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
                      <SelectItem value="PARTIALLY_PAID">Thanh toán 1 phần</SelectItem>
                      <SelectItem value="PAID">Đã thanh toán</SelectItem>
                      <SelectItem value="CANCELLED">Đã huỷ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border bg-muted/10 p-3">
                  <div className="text-xs font-medium text-muted-foreground">Tạm tính</div>
                  <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-primary">
                    {formatVnd(total)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrderEditLines
            products={products}
            draftPrices={draftPrices}
            onDraftPriceChange={onDraftPriceChange}
            onClear={onClear}
            onDec={onDec}
            onInc={onInc}
            onRemoveLine={onRemoveLine}
            formatVnd={formatVnd}
          />
        </div>
      </div>
    </div>
  )
}

