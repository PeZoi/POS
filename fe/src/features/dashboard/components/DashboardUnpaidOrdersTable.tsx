import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  formatCreatedAt,
  formatVnd,
  paidAmountLabel,
  statusBadgeVariant,
  statusLabel,
} from '@/features/orders/orderManagementUtils'
import type { Order } from '@/types/pos'

function orderRemain(o: Order): number {
  const total = Math.max(0, Math.floor(o.totalAmount ?? 0))
  const paid = Math.max(0, Math.floor(o.paidAmount ?? 0))
  return Math.max(0, total - paid)
}

export type DashboardUnpaidOrdersTableProps = {
  orders: Order[]
  loading: boolean
}

export function DashboardUnpaidOrdersTable({ orders, loading }: DashboardUnpaidOrdersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Mã</TableHead>
          <TableHead className="min-w-[120px]">Khách hàng</TableHead>
          <TableHead className="w-[150px] hidden sm:table-cell">Trạng thái</TableHead>
          <TableHead className="w-[130px] hidden md:table-cell text-right">Đã thanh toán</TableHead>
          <TableHead className="w-[120px] text-right">Còn lại</TableHead>
          <TableHead className="w-[150px] hidden lg:table-cell">Ngày tạo</TableHead>
          <TableHead className="w-[100px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-medium tabular-nums">#{o.orderCode ?? String(o.id)}</TableCell>
            <TableCell className="min-w-0 max-w-[200px] truncate text-sm">
              {o.customerName && o.customerName.trim() !== '' ? o.customerName : '—'}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant={statusBadgeVariant(o.status)}>{statusLabel(o.status)}</Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell text-right tabular-nums text-sm">
              {paidAmountLabel(o.paidAmount, o.totalAmount)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">{formatVnd(orderRemain(o))}</TableCell>
            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground tabular-nums">
              {formatCreatedAt(o.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link to={`/orders/${o.id}`}>
                  <Eye className="mr-1 size-3.5" />
                  Chi tiết
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}

        {!loading && orders.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
              Không có hoá đơn chưa hoàn thành thanh toán.
            </TableCell>
          </TableRow>
        )}
        {loading && (
          <TableRow>
            <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
              Đang tải…
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
