/** Chuỗi ngày theo múi giờ local (YYYY-MM-DD) — dùng làm khóa gom nhóm. */
export type LocalDayKey = string

/** Chu kỳ xem biểu đồ & thống kê theo đơn (gom theo ngày / tháng / quý / năm). */
export type DashboardTrendMode = 'DAY' | 'MONTH' | 'QUARTER' | 'YEAR'

export const DASHBOARD_TREND_MODES: readonly DashboardTrendMode[] = [
  'DAY',
  'MONTH',
  'QUARTER',
  'YEAR',
] as const

export type TrendBucketPoint = {
  label: string
  revenue: number
  orders: number
}

/** @deprecated Dùng TrendBucketPoint — giữ alias để tránh đổi hàng loạt tên nội bộ. */
export type DayBucketPoint = TrendBucketPoint

export type StatusSlice = {
  key: string
  name: string
  value: number
  fill: string
}

export type TopProductRow = {
  name: string
  quantity: number
  subtotal: number
}

export type TopCustomerRow = {
  name: string
  orderCount: number
  revenue: number
}
