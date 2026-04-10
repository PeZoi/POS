import type { OrderStatus } from '@/types/pos'

export function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function formatVndCompact(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.floor(amount)))
}

export function formatCreatedAt(iso?: string) {
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

export function statusLabel(status: OrderStatus | null) {
  if (status === 'PAID') return 'Đã thanh toán'
  if (status === 'PARTIALLY_PAID') return 'Thanh toán 1 phần'
  if (status === 'CANCELLED') return 'Đã huỷ'
  return 'Chờ thanh toán'
}

export function statusBadgeVariant(status: OrderStatus | null) {
  if (status === 'PAID') return 'success'
  if (status === 'PARTIALLY_PAID') return 'warning'
  if (status === 'CANCELLED') return 'muted'
  return 'secondary'
}

export function paidAmountLabel(paidAmount: number | null | undefined, totalAmount: number | null | undefined) {
  const paid = paidAmount == null ? null : Math.max(0, Math.floor(paidAmount))
  const total = totalAmount == null ? null : Math.max(0, Math.floor(totalAmount))
  if (paid == null) return '—'
  if (total != null && paid > total) return formatVnd(total)
  return formatVnd(paid)
}

export function paymentSuccessToast(opts: {
  amount: number
  paidBefore: number | null | undefined
  totalBefore: number | null | undefined
}) {
  const amount = Math.max(0, Math.floor(opts.amount))
  const paidBefore = Math.max(0, Math.floor(opts.paidBefore ?? 0))
  const totalBefore = Math.max(0, Math.floor(opts.totalBefore ?? 0))
  const remainBefore = Math.max(0, totalBefore - paidBefore)

  const isSettlingAllRemaining = remainBefore > 0 && amount === remainBefore
  const isFullOnFirstPayment = isSettlingAllRemaining && paidBefore === 0
  const isPayingRemainingAfterPartial = isSettlingAllRemaining && paidBefore > 0

  if (isFullOnFirstPayment) {
    return {
      title: 'Thanh toán đầy đủ',
      description: `Đã thanh toán toàn bộ hoá đơn: ${formatVnd(amount)}`,
    }
  }
  if (isPayingRemainingAfterPartial) {
    return {
      title: 'Thanh toán phần còn lại',
      description: `Đã thanh toán nốt: ${formatVnd(amount)}`,
    }
  }
  return {
    title: 'Thanh toán 1 phần',
    description: `Đã ghi nhận ${formatVnd(amount)}`,
  }
}

export function parseMoneyParam(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number(String(raw).replace(/\s/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

export function normalize(s: string) {
  return s.trim().toLowerCase()
}

