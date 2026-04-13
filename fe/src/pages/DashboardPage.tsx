import { ArrowRight, Package, ReceiptText, TrendingUp, Users } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardAnalytics } from '@/features/dashboard/components/DashboardAnalytics'
import { DashboardRecentProductsTable } from '@/features/dashboard/components/DashboardRecentProductsTable'
import { DashboardUnpaidOrdersTable } from '@/features/dashboard/components/DashboardUnpaidOrdersTable'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import type { DashboardTrendMode } from '@/features/dashboard/types/dashboard.types'
import {
  computeOrdersByStatus,
  computeTodayRevenue,
  computeTopCustomers,
  computeTopProducts,
  computeTrendPoints,
  filterOrdersAwaitingPayment,
  filterOrdersInTrendWindow,
  trendModeLabel
} from '@/features/dashboard/utils/dashboardAggregations'
import { formatVnd } from '@/features/orders/orderManagementUtils'

export function DashboardPage() {
  const { state, products, orders, reload } = useDashboardData()
  const [trendMode, setTrendMode] = React.useState<DashboardTrendMode>('DAY')

  const trendPoints = React.useMemo(() => computeTrendPoints(orders, trendMode), [orders, trendMode])
  const windowOrders = React.useMemo(() => filterOrdersInTrendWindow(orders, trendMode), [orders, trendMode])

  const ordersByStatus = React.useMemo(() => computeOrdersByStatus(windowOrders), [windowOrders])
  const topProducts = React.useMemo(() => computeTopProducts(windowOrders, 6), [windowOrders])
  const topCustomers = React.useMemo(() => computeTopCustomers(windowOrders, 6), [windowOrders])

  const todayRevenue = React.useMemo(() => computeTodayRevenue(orders), [orders])
  const periodRevenue = React.useMemo(() => trendPoints.reduce((s, d) => s + d.revenue, 0), [trendPoints])

  const productsTotal = products.filter((p) => !p.isDeleted).length

  const recent = React.useMemo(
    () =>
      [...products]
        .filter((p) => !p.isDeleted)
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
        .slice(0, 5),
    [products],
  )

  const unpaidOrders = React.useMemo(
    () =>
      filterOrdersAwaitingPayment(orders)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .slice(0, 10),
    [orders],
  )

  const loading = state === 'loading' || state === 'idle'
  const failed = state === 'error'

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xl font-semibold sm:text-2xl">Dashboard</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Thống kê nhanh từ dữ liệu sản phẩm &amp; hoá đơn 
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" disabled={loading} onClick={() => reload()}>
              Làm mới dữ liệu
            </Button>
            <Button asChild variant="outline">
              <Link to="/products">
                Quản lý sản phẩm <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link to="/orders">
                Quản lý hoá đơn <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </div>
        {failed && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Không tải được dữ liệu. Kiểm tra backend và thử &quot;Làm mới dữ liệu&quot;.
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-muted-foreground" />
              Sản phẩm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{loading ? '—' : productsTotal}</div>
            <div className="mt-1 text-sm text-muted-foreground">Tổng sản phẩm</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4 text-muted-foreground" />
              Hoá đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{loading ? '—' : orders.length}</div>
            <div className="mt-1 text-sm text-muted-foreground">Tổng hoá đơn</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-muted-foreground" />
              Doanh thu hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
              {loading ? '—' : formatVnd(todayRevenue)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">Doanh thu hôm nay</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-muted-foreground" />
              {trendMode === 'DAY' ? '7 ngày & khách' : `${trendModeLabel(trendMode)} · tổng kỳ`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
              {loading ? '—' : formatVnd(periodRevenue)}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">Doanh thu {trendModeLabel(trendMode)}</div>
          </CardContent>
        </Card>
      </div>

      {!loading && !failed && (
        <DashboardAnalytics
          trendMode={trendMode}
          onTrendModeChange={setTrendMode}
          trendPoints={trendPoints}
          ordersByStatus={ordersByStatus}
          topProducts={topProducts}
          topCustomers={topCustomers}
        />
      )}

      {loading && (
        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center text-sm text-muted-foreground">
          Đang tải biểu đồ…
        </div>
      )}

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Hoá đơn chưa hoàn thành thanh toán</div>
          <Button asChild variant="outline" size="sm">
            <Link to="/orders">
              Quản lý hoá đơn <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>

        <DashboardUnpaidOrdersTable orders={unpaidOrders} loading={loading} />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Sản phẩm cập nhật gần đây</div>
          <Button asChild variant="outline" size="sm">
            <Link to="/products">Xem tất cả</Link>
          </Button>
        </div>

        <DashboardRecentProductsTable recent={recent} loading={loading} />
      </div>
    </div>
  )
}
