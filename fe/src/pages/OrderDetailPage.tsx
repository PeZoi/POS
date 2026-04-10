import * as React from 'react'
import { ArrowLeft, CreditCard, ReceiptText, Boxes, History, Printer } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/services/apiClient'
import { orderService } from '@/services/orderService'
import type { Order, OrderPayment, OrderStatus } from '@/types/pos'
import { OrderPaymentDialog } from '@/features/orders/components/OrderPaymentDialog'
import { OrderPrintDialog } from '@/features/orders/components/OrderPrintDialog'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatCreatedAt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function statusBadgeVariant(status: OrderStatus | null) {
  if (status === 'PAID') return 'success'
  if (status === 'PARTIALLY_PAID') return 'warning'
  if (status === 'CANCELLED') return 'muted'
  return 'secondary'
}

function statusLabel(status: OrderStatus | null) {
  if (status === 'PAID') return 'Đã thanh toán'
  if (status === 'PARTIALLY_PAID') return 'Thanh toán 1 phần'
  if (status === 'CANCELLED') return 'Đã huỷ'
  return 'Chờ thanh toán'
}

function paidAmountLabel(paidAmount: number | null | undefined, totalAmount: number | null | undefined) {
  const paid = paidAmount == null ? null : Math.max(0, Math.floor(paidAmount))
  const total = totalAmount == null ? null : Math.max(0, Math.floor(totalAmount))
  if (paid == null) return '—'
  if (total != null && paid > total) return formatVnd(total)
  return formatVnd(paid)
}

export function OrderDetailPage() {
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const orderId = React.useMemo(() => {
    const raw = params.id
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }, [params.id])

  const [order, setOrder] = React.useState<Order | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [tab, setTab] = React.useState<'products' | 'payments'>('products')
  const [payments, setPayments] = React.useState<OrderPayment[] | null>(null)
  const [paymentsLoading, setPaymentsLoading] = React.useState(false)
  const [paymentsError, setPaymentsError] = React.useState<string | null>(null)

  const [payOpen, setPayOpen] = React.useState(false)
  const [paySubmitting, setPaySubmitting] = React.useState(false)

  const [printOpen, setPrintOpen] = React.useState(false)

  const remainingAmount = React.useMemo(() => {
    if (!order) return 0
    const total = Math.max(0, order.totalAmount ?? 0)
    const paid = Math.max(0, order.paidAmount ?? 0)
    return Math.max(0, total - paid)
  }, [order])

  const canPay = React.useMemo(() => {
    if (!order) return false
    return order.status === 'PENDING' || order.status === 'PARTIALLY_PAID'
  }, [order])

  const reloadOrder = React.useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    try {
      const data = await orderService.getById(orderId)
      setOrder(data)
    } catch (e) {
      setOrder(null)
      setError(e instanceof Error ? e.message : 'Không thể tải chi tiết hoá đơn.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  const loadPayments = React.useCallback(async () => {
    if (!orderId) return
    setPaymentsLoading(true)
    setPaymentsError(null)
    try {
      const list = await orderService.listPayments(orderId)
      setPayments(list)
    } catch (e) {
      setPayments(null)
      setPaymentsError(e instanceof Error ? e.message : 'Không thể tải lịch sử thanh toán.')
    } finally {
      setPaymentsLoading(false)
    }
  }, [orderId])

  React.useEffect(() => {
    void reloadOrder()
  }, [reloadOrder])

  React.useEffect(() => {
    const action = searchParams.get('action')
    if (action !== 'pay') return
    if (!canPay) {
      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
      return
    }
    setPayOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canPay, remainingAmount])

  const openPay = React.useCallback(() => {
    setPayOpen(true)
  }, [])

  const openPrint = React.useCallback(() => {
    setPrintOpen(true)
  }, [])

  const submitPayment = React.useCallback(async (payload: { amount: number; note: string | null }) => {
    if (!orderId || !order) return
    const amount = payload.amount
    const remain = Math.max(0, (order.totalAmount ?? 0) - (order.paidAmount ?? 0))
    if (amount < 1) {
      globalThis.alert?.('Số tiền thanh toán phải >= 1.')
      return
    }
    if (amount > remain) {
      globalThis.alert?.(`Số tiền thanh toán vượt quá số tiền còn lại: ${formatVnd(remain)}`)
      return
    }

    setPaySubmitting(true)
    try {
      await orderService.addPayment(orderId, { amount, note: payload.note ?? null })
      const paidBefore = order.paidAmount ?? 0
      const totalBefore = order.totalAmount ?? 0
      const remainBefore = Math.max(0, totalBefore - paidBefore)
      if (remainBefore > 0 && amount === remainBefore && paidBefore <= 0) {
        toast.success('Thanh toán đầy đủ', { description: `Đã thanh toán toàn bộ hoá đơn: ${formatVnd(amount)}` })
      } else if (remainBefore > 0 && amount === remainBefore && paidBefore > 0) {
        toast.success('Thanh toán phần còn lại', { description: `Đã thanh toán nốt: ${formatVnd(amount)}` })
      } else {
        toast.success('Thanh toán 1 phần', { description: `Đã ghi nhận ${formatVnd(amount)}` })
      }

      setPayOpen(false)

      await reloadOrder()
      setTab('products')
      if (tab === 'payments') await loadPayments()

      const next = new URLSearchParams(searchParams)
      next.delete('action')
      setSearchParams(next, { replace: true })
      navigate(`/orders/${orderId}`, { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : 'Không thể ghi nhận thanh toán.'
      globalThis.alert?.(msg)
    } finally {
      setPaySubmitting(false)
    }
  }, [loadPayments, navigate, order, orderId, reloadOrder, searchParams, setSearchParams, tab])

  if (!orderId) {
    return (
      <div className="rounded-2xl border bg-destructive/5 p-4 text-sm text-destructive">
        ID hoá đơn không hợp lệ.
      </div>
    )
  }

  return (
    <div className="relative">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => navigate('/orders')}
              aria-label="Quay lại"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ReceiptText className="size-4 text-muted-foreground" />
                <div className="truncate text-sm font-semibold">
                  {order ? `Hoá đơn #${order.orderCode ?? String(order.id)}` : 'Chi tiết hoá đơn'}
                </div>
              </div>
              {order && (
                <div className="mt-1">
                  <Badge variant={statusBadgeVariant(order.status)}>{statusLabel(order.status)}</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={openPrint}
              className="rounded-xl"
              aria-label="In hoá đơn"
              disabled={!order || loading}
            >
              <Printer className="mr-1.5 size-4" />
              <span className="hidden sm:inline">In hoá đơn</span>
            </Button>

            {canPay && (
              <Button
                size="sm"
                onClick={openPay}
                className="rounded-xl"
                aria-label="Thanh toán"
              >
                <CreditCard className="mr-1.5 size-4" />
                <span className="hidden sm:inline">Thanh toán</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:gap-6 sm:px-6">

        {(error || paymentsError) && (
          <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">
            {error ?? paymentsError}
          </div>
        )}

        <Card>
          <CardContent className="grid gap-3 p-4 sm:p-6">
            <div className="rounded-lg border bg-muted/10 p-3">
              <div className="text-xs font-medium text-muted-foreground">Tổng tiền hoá đơn</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-primary">
                {formatVnd(order?.totalAmount ?? 0)}
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground">Khách hàng</div>
                <div className="max-w-[70%] truncate text-right">
                  {order?.customerName && order.customerName.trim() !== '' ? order.customerName : '—'}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Đã thanh toán</div>
                <div className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {paidAmountLabel(order?.paidAmount, order?.totalAmount)}
                </div>
              </div>
              {remainingAmount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground">Còn lại</div>
                  <div className="font-semibold tabular-nums text-destructive">{formatVnd(remainingAmount)}</div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Ngày tạo</div>
                <div className="tabular-nums">{formatCreatedAt(order?.createdAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center">
          <div className="inline-flex w-full max-w-xl items-center rounded-2xl border bg-muted/40 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setTab('products')}
              className={[
                'group flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                tab === 'products'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
              aria-pressed={tab === 'products'}
            >
              <Boxes className="size-4 opacity-80" />
              <span>Sản phẩm</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setTab('payments')
                if (payments == null && !paymentsLoading) await loadPayments()
              }}
              className={[
                'group flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                tab === 'payments'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
              aria-pressed={tab === 'payments'}
            >
              <History className="size-4 opacity-80" />
              <span>Lịch sử thanh toán</span>
            </button>
          </div>
        </div>

        {tab === 'products' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">ID</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="w-[120px] text-right">Giá</TableHead>
                <TableHead className="w-[120px] text-right">SL</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order?.items ?? []).map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="text-muted-foreground">{it.productId}</TableCell>
                  <TableCell className="font-medium">{it.productName}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(it.price)}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(it.subtotal)}</TableCell>
                </TableRow>
              ))}

              {(order?.items ?? []).length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có sản phẩm trong hoá đơn.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Thời gian</TableHead>
                <TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Ghi chú</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">{formatCreatedAt(p.createdAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(p.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.note && p.note.trim() !== '' ? p.note : '—'}</TableCell>
                </TableRow>
              ))}

              {(payments ?? []).length === 0 && !paymentsLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có lịch sử thanh toán.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

      <OrderPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        order={order}
        remainingAmount={remainingAmount}
      />

      <OrderPaymentDialog
        open={payOpen}
        onOpenChange={(o) => {
          if (!o) setPayOpen(false)
          else setPayOpen(true)
        }}
        title={order ? `Thanh toán hoá đơn #${order.orderCode ?? String(order.id)}` : 'Thanh toán'}
        description="Bạn có thể thanh toán nhiều đợt; hệ thống sẽ lưu lịch sử từng lần."
        remainingAmount={remainingAmount}
        defaultAmount={remainingAmount}
        submitting={paySubmitting}
        onSubmit={submitPayment}
      />
      </div>
    </div>
  )
}

