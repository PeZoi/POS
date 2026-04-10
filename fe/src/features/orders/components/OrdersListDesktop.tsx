import { CreditCard, Eye, Pencil } from 'lucide-react'

import type { Order } from '@/types/pos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCreatedAt, formatVnd, paidAmountLabel, statusBadgeVariant, statusLabel } from '@/features/orders/orderManagementUtils'

export function OrdersListDesktop({
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
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[130px]">Mã</TableHead>
            <TableHead>Khách hàng</TableHead>
            <TableHead className="w-[160px]">Trạng thái</TableHead>
            <TableHead className="w-[170px] text-right">Đã thanh toán</TableHead>
            <TableHead className="text-right">Tổng tiền</TableHead>
            <TableHead className="w-[190px]">Ngày tạo</TableHead>
            <TableHead className="w-[220px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium tabular-nums">#{o.orderCode ?? String(o.id)}</TableCell>
              <TableCell className="min-w-0">
                <span className="block max-w-md truncate text-sm text-foreground">
                  {o.customerName && o.customerName.trim() !== '' ? o.customerName : '—'}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(o.status)}>{statusLabel(o.status)}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {paidAmountLabel(o.paidAmount, o.totalAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatVnd(o.totalAmount ?? 0)}</TableCell>
              <TableCell className="text-sm text-muted-foreground tabular-nums">
                {formatCreatedAt(o.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex flex-col items-end gap-2">
                  <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onView(o)}>
                      <Eye className="mr-1.5 size-4" />
                      Xem
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(o)}>
                      <Pencil className="mr-1.5 size-4" />
                      Sửa
                    </Button>
                  </div>

                  {(o.status === 'PENDING' || o.status === 'PARTIALLY_PAID') && (
                    <Button variant="default" size="sm" className="w-full" onClick={() => onPay(o)}>
                      <CreditCard className="mr-1.5 size-4" />
                      Thanh toán
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}

          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center">
                <div className="text-sm text-muted-foreground">
                  {loading ? 'Đang tải…' : 'Không có hoá đơn phù hợp.'}
                </div>
                <div className="mt-3">
                  <Button variant="outline" onClick={onClearFilters}>
                    Xoá bộ lọc
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

