import { statusLabel } from '@/features/orders/orderManagementUtils'
import type { Order, OrderStatus } from '@/types/pos'

import type {
  DashboardTrendMode,
  DayBucketPoint,
  LocalDayKey,
  StatusSlice,
  TopCustomerRow,
  TopProductRow,
} from '../types/dashboard.types'

const CHART_FILLS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

export function orderLocalDayKey(iso?: string | null): LocalDayKey | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA')
}

export function isCancelledOrder(o: Order): boolean {
  return o.status === 'CANCELLED'
}

/** Hoá đơn chưa thanh toán đủ (chờ hoặc thanh toán một phần). */
export function filterOrdersAwaitingPayment(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === 'PENDING' || o.status === 'PARTIALLY_PAID')
}

export function orderTotalSafe(o: Order): number {
  return Math.max(0, Math.floor(o.totalAmount ?? 0))
}

export function computeTodayRevenue(orders: Order[]): number {
  const todayKey = new Date().toLocaleDateString('en-CA')
  return orders
    .filter((o) => !isCancelledOrder(o) && orderLocalDayKey(o.createdAt) === todayKey)
    .reduce((s, o) => s + orderTotalSafe(o), 0)
}

function buildDayBuckets(days: number): { key: LocalDayKey; label: string }[] {
  const out: { key: LocalDayKey; label: string }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-CA') as LocalDayKey
    const label = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(d)
    out.push({ key, label })
  }
  return out
}

export function computeRevenueAndOrdersByDay(orders: Order[], days = 7): DayBucketPoint[] {
  const buckets = buildDayBuckets(days)
  const map = new Map<LocalDayKey, { revenue: number; orders: number }>()
  for (const b of buckets) {
    map.set(b.key, { revenue: 0, orders: 0 })
  }
  for (const o of orders) {
    if (isCancelledOrder(o)) continue
    const k = orderLocalDayKey(o.createdAt)
    if (!k || !map.has(k)) continue
    const cell = map.get(k)!
    cell.revenue += orderTotalSafe(o)
    cell.orders += 1
  }
  return buckets.map((b) => {
    const c = map.get(b.key)!
    return { label: b.label, revenue: c.revenue, orders: c.orders }
  })
}

export function computeOrdersByStatus(orders: Order[]): StatusSlice[] {
  const counts = new Map<string, { status: OrderStatus | null; count: number }>()
  for (const o of orders) {
    const key = o.status == null ? 'NULL' : o.status
    const cur = counts.get(key) ?? { status: o.status, count: 0 }
    cur.count += 1
    counts.set(key, cur)
  }
  let i = 0
  return [...counts.entries()]
    .map(([key, { status, count }]) => ({
      key,
      name: statusLabel(status),
      value: count,
      fill: CHART_FILLS[i++ % CHART_FILLS.length]!,
    }))
    .sort((a, b) => b.value - a.value)
}

export function computeTopProducts(orders: Order[], limit = 6): TopProductRow[] {
  const map = new Map<string, { quantity: number; subtotal: number }>()
  for (const o of orders) {
    if (isCancelledOrder(o)) continue
    const items = o.items ?? []
    for (const it of items) {
      const name = it.productName?.trim() || `SP #${it.productId}`
      const cur = map.get(name) ?? { quantity: 0, subtotal: 0 }
      cur.quantity += Math.max(0, Math.floor(it.quantity))
      cur.subtotal += Math.max(0, Math.floor(it.subtotal))
      map.set(name, cur)
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, quantity: v.quantity, subtotal: v.subtotal }))
    .sort((a, b) => b.subtotal - a.subtotal)
    .slice(0, limit)
}

export function computeTopCustomers(orders: Order[], limit = 6): TopCustomerRow[] {
  const map = new Map<string, { orderCount: number; revenue: number }>()
  for (const o of orders) {
    if (isCancelledOrder(o)) continue
    const raw = o.customerName?.trim()
    const name = raw && raw.length > 0 ? raw : 'Khách lẻ'
    const cur = map.get(name) ?? { orderCount: 0, revenue: 0 }
    cur.orderCount += 1
    cur.revenue += orderTotalSafe(o)
    map.set(name, cur)
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, orderCount: v.orderCount, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export function countUniqueCustomerNames(orders: Order[]): number {
  const set = new Set<string>()
  for (const o of orders) {
    if (isCancelledOrder(o)) continue
    const raw = o.customerName?.trim()
    if (raw && raw.length > 0) set.add(raw)
  }
  return set.size
}

export function countPaidOrders(orders: Order[]): number {
  return orders.filter((o) => o.status === 'PAID').length
}

// --- Chu kỳ: tháng / quý / năm + cửa sổ thống kê ---

export function trendModeLabel(mode: DashboardTrendMode): string {
  if (mode === 'DAY') return 'Theo ngày'
  if (mode === 'MONTH') return 'Theo tháng'
  if (mode === 'QUARTER') return 'Theo quý'
  return 'Theo năm'
}

export function trendRangeDescription(mode: DashboardTrendMode): string {
  if (mode === 'DAY') return '7 ngày gần nhất · không tính đơn đã huỷ'
  if (mode === 'MONTH') return '12 tháng gần nhất (theo lịch) · không tính đơn đã huỷ'
  if (mode === 'QUARTER') return '8 quý gần nhất · không tính đơn đã huỷ'
  return '5 năm gần nhất · không tính đơn đã huỷ'
}

function orderDate(o: Order): Date | null {
  if (!o.createdAt) return null
  const d = new Date(o.createdAt)
  return Number.isNaN(d.getTime()) ? null : d
}

export function orderLocalMonthKey(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

export function orderLocalQuarterKey(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const q = Math.floor(d.getMonth() / 3) + 1
  return `${y}-Q${q}`
}

export function orderLocalYearKey(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return String(d.getFullYear())
}

function startOfQuarter(year: number, quarter: number): Date {
  const m = (quarter - 1) * 3
  return new Date(year, m, 1, 0, 0, 0, 0)
}

function endOfQuarter(year: number, quarter: number): Date {
  const m = quarter * 3 - 1
  return new Date(year, m + 1, 0, 23, 59, 59, 999)
}

function buildMonthBuckets(count: number): { key: string; label: string; year: number; month: number }[] {
  const now = new Date()
  const endYear = now.getFullYear()
  const endMonth = now.getMonth()
  const out: { key: string; label: string; year: number; month: number }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonth - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const key = `${y}-${String(m + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('vi-VN', { month: 'short', year: 'numeric' }).format(d)
    out.push({ key, label, year: y, month: m })
  }
  return out
}

function buildQuarterBuckets(count: number): { key: string; label: string; year: number; quarter: number }[] {
  const now = new Date()
  let y = now.getFullYear()
  let q = Math.floor(now.getMonth() / 3) + 1
  for (let back = count - 1; back > 0; back--) {
    q -= 1
    if (q < 1) {
      q = 4
      y -= 1
    }
  }
  const out: { key: string; label: string; year: number; quarter: number }[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      key: `${y}-Q${q}`,
      label: `Quý ${q}/${y}`,
      year: y,
      quarter: q,
    })
    q += 1
    if (q > 4) {
      q = 1
      y += 1
    }
  }
  return out
}

function buildYearBuckets(count: number): { key: string; label: string; year: number }[] {
  const y = new Date().getFullYear()
  const out: { key: string; label: string; year: number }[] = []
  for (let i = count - 1; i >= 0; i--) {
    const yy = y - i
    out.push({ key: String(yy), label: String(yy), year: yy })
  }
  return out
}

/** Cận dưới / cận trên (local) để lọc đơn theo cùng kỳ với biểu đồ. */
export function getTrendWindowBounds(mode: DashboardTrendMode): { start: Date; end: Date } {
  const now = new Date()
  if (mode === 'DAY') {
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }
  if (mode === 'MONTH') {
    const buckets = buildMonthBuckets(12)
    const first = buckets[0]!
    const last = buckets[buckets.length - 1]!
    const start = new Date(first.year, first.month, 1, 0, 0, 0, 0)
    const end = new Date(last.year, last.month + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }
  if (mode === 'QUARTER') {
    const buckets = buildQuarterBuckets(8)
    const first = buckets[0]!
    const last = buckets[buckets.length - 1]!
    return {
      start: startOfQuarter(first.year, first.quarter),
      end: endOfQuarter(last.year, last.quarter),
    }
  }
  const buckets = buildYearBuckets(5)
  const first = buckets[0]!
  const last = buckets[buckets.length - 1]!
  const start = new Date(first.year, 0, 1, 0, 0, 0, 0)
  const end = new Date(last.year, 11, 31, 23, 59, 59, 999)
  return { start, end }
}

export function filterOrdersInTrendWindow(orders: Order[], mode: DashboardTrendMode): Order[] {
  const { start, end } = getTrendWindowBounds(mode)
  return orders.filter((o) => {
    const d = orderDate(o)
    if (!d) return false
    return d >= start && d <= end
  })
}

function fillBucketsFromOrders(
  buckets: { key: string; label: string }[],
  orders: Order[],
  keyFn: (iso?: string | null) => string | null,
): DayBucketPoint[] {
  const map = new Map<string, { revenue: number; orders: number }>()
  for (const b of buckets) {
    map.set(b.key, { revenue: 0, orders: 0 })
  }
  for (const o of orders) {
    if (isCancelledOrder(o)) continue
    const k = keyFn(o.createdAt)
    if (!k || !map.has(k)) continue
    const cell = map.get(k)!
    cell.revenue += orderTotalSafe(o)
    cell.orders += 1
  }
  return buckets.map((b) => {
    const c = map.get(b.key)!
    return { label: b.label, revenue: c.revenue, orders: c.orders }
  })
}

export function computeRevenueAndOrdersByMonth(orders: Order[], monthCount = 12): DayBucketPoint[] {
  const buckets = buildMonthBuckets(monthCount)
  return fillBucketsFromOrders(buckets, orders, orderLocalMonthKey)
}

export function computeRevenueAndOrdersByQuarter(orders: Order[], quarterCount = 8): DayBucketPoint[] {
  const buckets = buildQuarterBuckets(quarterCount)
  return fillBucketsFromOrders(buckets, orders, orderLocalQuarterKey)
}

export function computeRevenueAndOrdersByYear(orders: Order[], yearCount = 5): DayBucketPoint[] {
  const buckets = buildYearBuckets(yearCount)
  return fillBucketsFromOrders(buckets, orders, orderLocalYearKey)
}

export function computeTrendPoints(orders: Order[], mode: DashboardTrendMode): DayBucketPoint[] {
  if (mode === 'DAY') return computeRevenueAndOrdersByDay(orders, 7)
  if (mode === 'MONTH') return computeRevenueAndOrdersByMonth(orders, 12)
  if (mode === 'QUARTER') return computeRevenueAndOrdersByQuarter(orders, 8)
  return computeRevenueAndOrdersByYear(orders, 5)
}
