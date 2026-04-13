import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatVnd } from '@/features/orders/orderManagementUtils'
import type { Product, ProductStatus } from '@/types/pos'

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

export type DashboardRecentProductsTableProps = {
  recent: Product[]
  loading: boolean
}

export function DashboardRecentProductsTable({ recent, loading }: DashboardRecentProductsTableProps) {
  return (
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

        {!loading && recent.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu (hãy kiểm tra BE đang chạy và DB có dữ liệu).
            </TableCell>
          </TableRow>
        )}
        {loading && (
          <TableRow>
            <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
              Đang tải…
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
