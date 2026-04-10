import { CreditCard, Eye, Pencil } from 'lucide-react'

import type { Order } from '@/types/pos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCreatedAt, formatVnd, paidAmountLabel, statusBadgeVariant, statusLabel } from '@/features/orders/orderManagementUtils'

export function OrdersListMobile({
  orders,
  loading,
  onClearFilters,
  onView,
  onEdit,
  onPay,
}: {
  orders: Order[]
  loading: boolean
  onClearFilters: () => void
  onView: (order: Order) => void
  onEdit: (order: Order) => void
  onPay: (order: Order) => void
}) {
  return (
    <div className="md:hidden">
      <div className="grid gap-3">
        {orders.map((o) => (
          <Card key={o.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">#{o.orderCode ?? String(o.id)}</CardTitle>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {formatCreatedAt(o.createdAt)}
                  </div>
                </div>
                <Badge variant={statusBadgeVariant(o.status)} className="shrink-0">
                  {statusLabel(o.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Tổng tiền</div>
                <div className="text-base font-semibold tabular-nums">{formatVnd(o.totalAmount ?? 0)}</div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Khách hàng</div>
                <div className="max-w-[70%] truncate text-sm text-muted-foreground">
                  {o.customerName && o.customerName.trim() !== '' ? o.customerName : '—'}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Đã thanh toán</div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {paidAmountLabel(o.paidAmount, o.totalAmount)}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-row gap-2">
              {(o.status === 'PENDING' || o.status === 'PARTIALLY_PAID') && (
                <Button size="sm" className="flex-1" onClick={() => onPay(o)}>
                  <CreditCard className="mr-1.5 size-4" />
                  Thanh toán
                </Button>
              )}
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(o)}>
                <Eye className="mr-1.5 size-4" />
                Xem
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(o)}>
                <Pencil className="mr-1.5 size-4" />
                Sửa
              </Button>
            </CardFooter>
          </Card>
        ))}

        {orders.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <div className="text-sm text-muted-foreground">
                {loading ? 'Đang tải…' : 'Không có hoá đơn phù hợp.'}
              </div>
              <div className="mt-3">
                <Button variant="outline" onClick={onClearFilters}>
                  Xoá bộ lọc
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

