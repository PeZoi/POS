import * as React from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { Order, OrderStatus } from '@/types/pos'
import { useOrders } from '@/features/orders/hooks/useOrders'
import { orderService } from '@/services/orderService'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/services/apiClient'
import { toast } from 'sonner'
import { OrderPaymentDialog } from '@/features/orders/components/OrderPaymentDialog'
import { OrdersToolbar } from '@/features/orders/components/OrdersToolbar'
import { OrdersListDesktop } from '@/features/orders/components/OrdersListDesktop'
import { OrdersListMobile } from '@/features/orders/components/OrdersListMobile'
import { formatVnd, paymentSuccessToast } from '@/features/orders/orderManagementUtils'

export function OrderManagement() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const appliedQuery = React.useMemo(() => searchParams.get('q') ?? '', [searchParams])
  const appliedStatuses = React.useMemo(() => {
    const raw = searchParams.getAll('status').flatMap((v) => String(v).split(','))
    const out: OrderStatus[] = []
    for (const r of raw) {
      const s = String(r).trim()
      if (s === 'PENDING' || s === 'PARTIALLY_PAID' || s === 'PAID' || s === 'CANCELLED') out.push(s)
    }
    return Array.from(new Set(out))
  }, [searchParams])
  const appliedSortBy = React.useMemo(() => (searchParams.get('sortBy') ?? 'id').trim(), [searchParams])
  const appliedSortDir = React.useMemo(() => (searchParams.get('sortDir') ?? 'desc').trim(), [searchParams])
  const appliedTotalMin = React.useMemo(() => {
    const raw = searchParams.get('totalMin')
    if (raw == null || raw.trim() === '') return null
    const n = Number(String(raw).replace(/\s/g, ''))
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
  }, [searchParams])
  const appliedTotalMax = React.useMemo(() => {
    const raw = searchParams.get('totalMax')
    if (raw == null || raw.trim() === '') return null
    const n = Number(String(raw).replace(/\s/g, ''))
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
  }, [searchParams])

  const {
    items: orders,
    loading,
    error,
    reload,
    hasNext,
    loadMore,
  } = useOrders({
    q: appliedQuery,
    status: appliedStatuses.length > 0 ? appliedStatuses : 'ALL',
    totalMin: appliedTotalMin,
    totalMax: appliedTotalMax,
    sortBy:
      appliedSortBy === 'totalAmount' || appliedSortBy === 'customerName' || appliedSortBy === 'createdAt'
        ? appliedSortBy
        : 'id',
    sortDir: appliedSortDir === 'asc' ? 'asc' : 'desc',
    size: 20,
  })

  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)

  const clearFilters = React.useCallback(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('q')
        p.delete('status')
        p.delete('totalMin')
        p.delete('totalMax')
        p.delete('sortBy')
        p.delete('sortDir')
        return p
      },
      { replace: true },
    )
  }, [setSearchParams])

  const [payTarget, setPayTarget] = React.useState<Order | null>(null)
  const [payOpen, setPayOpen] = React.useState(false)
  const [paySubmitting, setPaySubmitting] = React.useState(false)

  React.useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          void loadMore()
        }
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const openCreate = () => {
    navigate('/cart')
  }

  const openEdit = (o: Order) => {
    navigate(`/orders/${o.id}/edit`)
  }

  const openPayFromList = React.useCallback((o: Order) => {
    setPayTarget(o)
    setPayOpen(true)
  }, [])

  const submitPayment = React.useCallback(async (payload: { amount: number; note: string | null }) => {
    if (!payTarget) return
    const total = Math.max(0, payTarget.totalAmount ?? 0)
    const paid = Math.max(0, payTarget.paidAmount ?? 0)
    const remain = Math.max(0, total - paid)
    const amount = payload.amount

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
      await orderService.addPayment(payTarget.id, { amount, note: payload.note ?? null })
      const meta = paymentSuccessToast({
        amount,
        paidBefore: payTarget.paidAmount,
        totalBefore: payTarget.totalAmount,
      })
      toast.success(meta.title, { description: meta.description })
      setPayOpen(false)
      setPayTarget(null)
      await reload()
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : 'Không thể ghi nhận thanh toán.'
      globalThis.alert?.(msg)
    } finally {
      setPaySubmitting(false)
    }
  }, [payTarget, reload])

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-tight sm:text-xl">Quản lý hoá đơn</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={openCreate}
            size="lg"
            className="w-full sm:w-auto rounded-xl px-5 text-base"
          >
            <Plus className="mr-1.5 size-4" />
            Tạo hoá đơn
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <OrdersToolbar searchParams={searchParams} setSearchParams={setSearchParams} />

      <OrdersListDesktop
        orders={orders}
        loading={loading}
        onClearFilters={clearFilters}
        onView={(o) => navigate(`/orders/${o.id}`)}
        onEdit={openEdit}
        onPay={openPayFromList}
      />

      <OrdersListMobile
        orders={orders}
        loading={loading}
        onClearFilters={clearFilters}
        onView={(o) => navigate(`/orders/${o.id}`)}
        onEdit={openEdit}
        onPay={openPayFromList}
      />

      <div
        ref={loadMoreRef}
        className="mt-2 h-8 w-full text-center text-xs text-muted-foreground"
      >
        {hasNext && (loading ? 'Đang tải…' : 'Đang tải thêm hoá đơn…')}
      </div>

      <OrderPaymentDialog
        open={payOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPayOpen(false)
            setPayTarget(null)
          } else {
            setPayOpen(true)
          }
        }}
        title={
          payTarget
            ? `Thanh toán hoá đơn #${payTarget.orderCode ?? String(payTarget.id)}`
            : 'Thanh toán'
        }
        description="Thanh toán trực tiếp từ danh sách hoá đơn."
        remainingAmount={Math.max(
          0,
          (payTarget?.totalAmount ?? 0) - (payTarget?.paidAmount ?? 0),
        )}
        defaultAmount={Math.max(
          0,
          (payTarget?.totalAmount ?? 0) - (payTarget?.paidAmount ?? 0),
        )}
        submitting={paySubmitting}
        onSubmit={submitPayment}
      />

    </div>
  )
}

