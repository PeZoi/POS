import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DASHBOARD_TREND_MODES,
  type DashboardTrendMode,
  type DayBucketPoint,
  type StatusSlice,
  type TopCustomerRow,
  type TopProductRow,
} from '@/features/dashboard/types/dashboard.types'
import { trendModeLabel, trendRangeDescription } from '@/features/dashboard/utils/dashboardAggregations'
import { formatVnd } from '@/features/orders/orderManagementUtils'

const CHART_COLORS = {
  revenue: 'var(--chart-1)',
  orders: 'var(--chart-2)',
  topProductRevenue: 'var(--chart-3)',
  topCustomerRevenue: 'var(--chart-4)',
  topProductQty: 'var(--chart-5)',
} as const

const tooltipProps = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--card-foreground)',
  },
  labelStyle: { color: 'var(--muted-foreground)' },
} as const

const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 }

function RevenueAreaChart({ data, xTickAngle = 0 }: { data: DayBucketPoint[]; xTickAngle?: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: xTickAngle ? 12 : 0 }}
      >
        <defs>
          <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.42} />
            <stop offset="60%" stopOpacity={0.12} />
            <stop offset="95%" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          angle={xTickAngle}
          textAnchor={xTickAngle ? 'end' : 'middle'}
          height={xTickAngle ? 68 : 36}
          interval={0}
        />
        <YAxis
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tickFormatter={(v) => formatVnd(Number(v))}
          width={100}
        />
        <Tooltip
          {...tooltipProps}
          cursor={{ stroke: 'var(--border)', strokeOpacity: 0.6 }}
          formatter={(value: number) => [formatVnd(value), 'Doanh thu']}
          labelFormatter={(label) => String(label)}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Doanh thu"
          stroke={CHART_COLORS.revenue}
          strokeWidth={2}
          fill="url(#dashRevenueFill)"
          dot={false}
          activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: CHART_COLORS.revenue }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function OrdersBarChart({ data, xTickAngle = 0 }: { data: DayBucketPoint[]; xTickAngle?: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: xTickAngle ? 12 : 0 }}
      >
        <defs>
          <linearGradient id="dashOrdersFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.orders} stopOpacity={0.9} />
            <stop offset="100%" stopColor={CHART_COLORS.orders} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          angle={xTickAngle}
          textAnchor={xTickAngle ? 'end' : 'middle'}
          height={xTickAngle ? 68 : 36}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          width={32}
        />
        <Tooltip
          {...tooltipProps}
          cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          formatter={(value: number) => [value, 'Số đơn']}
          labelFormatter={(label) => String(label)}
        />
        <Bar dataKey="orders" name="Số đơn" fill="url(#dashOrdersFill)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function StatusPieCard({
  title,
  description,
  data,
  emptyHint,
  valueUnit,
}: {
  title: string
  description: string
  data: StatusSlice[]
  emptyHint: string
  valueUnit: string
}) {
  return (
    <Card className="min-h-[320px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{emptyHint}</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} stroke="var(--card)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipProps}
                formatter={(value: number, _name, item) => {
                  const payload = item?.payload as StatusSlice | undefined
                  return [`${value} ${valueUnit}`, payload?.name ?? '—']
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}
                formatter={(value) => <span className="text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function TopProductsBar({ rows }: { rows: TopProductRow[] }) {
  const data = React.useMemo(
    () => [...rows].reverse().map((r) => ({ ...r, label: r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name })),
    [rows],
  )
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 36 + 40)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="dashTopProductRevenueFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CHART_COLORS.topProductRevenue} stopOpacity={0.35} />
            <stop offset="35%" stopColor={CHART_COLORS.topProductRevenue} stopOpacity={0.75} />
            <stop offset="100%" stopColor={CHART_COLORS.topProductRevenue} stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.55} horizontal={false} />
        <XAxis
          type="number"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tickFormatter={(v) => formatVnd(Number(v))}
          height={48}
          interval="preserveStartEnd"
        />
        <YAxis
          type="category"
          dataKey="label"
          width={100}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <Tooltip {...tooltipProps} formatter={(value: number) => [formatVnd(value), 'Thành tiền']} />
        <Bar dataKey="subtotal" name="Thành tiền" fill="url(#dashTopProductRevenueFill)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TopProductsQtyBar({ rows }: { rows: TopProductRow[] }) {
  const data = React.useMemo(
    () => [...rows].reverse().map((r) => ({ ...r, label: r.name.length > 28 ? `${r.name.slice(0, 26)}…` : r.name })),
    [rows],
  )
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 36 + 40)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="dashTopProductQtyFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CHART_COLORS.topProductQty} stopOpacity={0.3} />
            <stop offset="35%" stopColor={CHART_COLORS.topProductQty} stopOpacity={0.7} />
            <stop offset="100%" stopColor={CHART_COLORS.topProductQty} stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.55} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          height={48}
          interval="preserveStartEnd"
        />
        <YAxis
          type="category"
          dataKey="label"
          width={100}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <Tooltip {...tooltipProps} formatter={(value: number) => [value, 'Số lượng']} />
        <Bar dataKey="quantity" name="Số lượng" fill="url(#dashTopProductQtyFill)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TopCustomersBar({ rows }: { rows: TopCustomerRow[] }) {
  const data = React.useMemo(
    () => [...rows].reverse().map((r) => ({ ...r, label: r.name.length > 24 ? `${r.name.slice(0, 22)}…` : r.name })),
    [rows],
  )
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 36 + 40)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="dashTopCustomerFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CHART_COLORS.topCustomerRevenue} stopOpacity={0.35} />
            <stop offset="35%" stopColor={CHART_COLORS.topCustomerRevenue} stopOpacity={0.75} />
            <stop offset="100%" stopColor={CHART_COLORS.topCustomerRevenue} stopOpacity={0.95} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.55} horizontal={false} />
        <XAxis
          type="number"
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tickFormatter={(v) => formatVnd(Number(v))}
          height={48}
          interval="preserveStartEnd"
        />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <Tooltip {...tooltipProps} formatter={(value: number) => [formatVnd(value), 'Tổng mua']} />
        <Bar dataKey="revenue" name="Tổng mua" fill="url(#dashTopCustomerFill)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function trendChartTickAngle(mode: DashboardTrendMode): number {
  if (mode === 'MONTH' || mode === 'QUARTER') return -32
  return 0
}

export type DashboardAnalyticsProps = {
  trendMode: DashboardTrendMode
  onTrendModeChange: (mode: DashboardTrendMode) => void
  trendPoints: DayBucketPoint[]
  ordersByStatus: StatusSlice[]
  topProducts: TopProductRow[]
  topCustomers: TopCustomerRow[]
}

export function DashboardAnalytics({
  trendMode,
  onTrendModeChange,
  trendPoints,
  ordersByStatus,
  topProducts,
  topCustomers,
}: DashboardAnalyticsProps) {
  const xAngle = trendChartTickAngle(trendMode)
  const revenueTitle =
    trendMode === 'DAY'
      ? 'Doanh thu theo ngày'
      : trendMode === 'MONTH'
        ? 'Doanh thu theo tháng'
        : trendMode === 'QUARTER'
          ? 'Doanh thu theo quý'
          : 'Doanh thu theo năm'
  const ordersTitle =
    trendMode === 'DAY'
      ? 'Số hoá đơn theo ngày'
      : trendMode === 'MONTH'
        ? 'Số hoá đơn theo tháng'
        : trendMode === 'QUARTER'
          ? 'Số hoá đơn theo quý'
          : 'Số hoá đơn theo năm'

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{revenueTitle}</CardTitle>
            <CardDescription>{trendRangeDescription(trendMode)}</CardDescription>
          </div>
          <div
            className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1"
            role="group"
            aria-label="Chọn chu kỳ thống kê"
          >
            {DASHBOARD_TREND_MODES.map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={trendMode === m ? 'default' : 'ghost'}
                className="h-8 px-2.5 text-xs sm:px-3"
                onClick={() => onTrendModeChange(m)}
              >
                {trendModeLabel(m)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <RevenueAreaChart data={trendPoints} xTickAngle={xAngle} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{ordersTitle}</CardTitle>
          <CardDescription>Cùng kỳ với biểu đồ doanh thu</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <OrdersBarChart data={trendPoints} xTickAngle={xAngle} />
        </CardContent>
      </Card>

      <StatusPieCard
        title="Hoá đơn theo trạng thái"
        description="Chỉ các đơn trong kỳ đang chọn (mọi trạng thái)"
        data={ordersByStatus}
        emptyHint="Chưa có hoá đơn trong kỳ"
        valueUnit="đơn"
      />

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top sản phẩm theo doanh thu dòng</CardTitle>
          <CardDescription>Trong kỳ đang chọn · đơn không huỷ · gộp theo tên sản phẩm</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chưa có dòng hàng trên đơn</div>
          ) : (
            <TopProductsBar rows={topProducts} />
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top sản phẩm bán chạy</CardTitle>
          <CardDescription>Trong kỳ đang chọn · đơn không huỷ · gộp theo tên sản phẩm</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chưa có dòng hàng trên đơn</div>
          ) : (
            <TopProductsQtyBar rows={topProducts} />
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top khách theo tổng mua</CardTitle>
          <CardDescription>Trong kỳ đang chọn · không có tên hiển thị là “Khách lẻ”</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {topCustomers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chưa có dữ liệu khách</div>
          ) : (
            <TopCustomersBar rows={topCustomers} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
