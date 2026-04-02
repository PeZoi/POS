import { ArrowRight, Package, ReceiptText, TrendingUp } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { orderService } from '@/services/orderService'
import { productService } from '@/services/productService'
import type { ProductStatus } from '@/types/pos'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    amount,
  )
}

function formatUpdatedAt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function statusBadgeVariant(status: ProductStatus) {
  return status === 'ACTIVE' ? 'success' : 'muted'
}

function statusLabel(status: ProductStatus) {
  return status === 'ACTIVE' ? 'Đang bán' : 'Tạm ngưng'
}

export function DashboardPage() {
  const [productsCount, setProductsCount] = React.useState<number | null>(null)
  const [ordersCount, setOrdersCount] = React.useState<number | null>(null)
  const [recent, setRecent] = React.useState<Awaited<ReturnType<typeof productService.list>>>([])

  React.useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        const [products, orders] = await Promise.all([productService.list(), orderService.list()])
        if (!alive) return
        setProductsCount(products.length)
        setOrdersCount(orders.length)
        setRecent(
          [...products]
            .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
            .slice(0, 5),
        )
      } catch {
        if (!alive) return
        setProductsCount(null)
        setOrdersCount(null)
        setRecent([])
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  const todayRevenue = React.useMemo(() => {
    // backend chưa có endpoint report; tạm tính từ danh sách orders đã load (nếu cần sẽ chuyển sang API report).
    return 0
  }, [])

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xl font-semibold sm:text-2xl">Dashboard</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Tổng quan nhanh cho cửa hàng
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" />
              Sản phẩm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {productsCount ?? '—'}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">Tổng số sản phẩm</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="size-4 text-muted-foreground" />
              Hoá đơn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{ordersCount ?? '—'}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Tổng số hoá đơn
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              Doanh thu hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{formatVnd(todayRevenue)}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Sẽ làm chuẩn khi có API báo cáo
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Sản phẩm cập nhật gần đây</div>
          <Button asChild variant="outline" size="sm">
            <Link to="/products">Xem tất cả</Link>
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead className="hidden sm:table-cell">Barcode</TableHead>
              <TableHead className="text-right">Giá</TableHead>
              <TableHead className="hidden md:table-cell">Trạng thái</TableHead>
              <TableHead className="w-[140px]">Cập nhật</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                  {p.barcode}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(p.price)}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={statusBadgeVariant(p.status)}>{statusLabel(p.status)}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {formatUpdatedAt(p.updatedAt)}
                </TableCell>
              </TableRow>
            ))}

            {recent.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu (hãy kiểm tra BE đang chạy và DB có dữ liệu).
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

