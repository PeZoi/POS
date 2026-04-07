import * as React from 'react'
import { Plus, Search, Trash2, Pencil } from 'lucide-react'

import type { Product, ProductStatus } from '@/types/pos'
import { useProducts } from '@/features/products/hooks/useProducts'
import { ProductFormModal } from '@/features/products/components/ProductFormModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type StatusFilter = 'ALL' | ProductStatus

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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function statusBadgeVariant(status: ProductStatus) {
  return status === 'ACTIVE' ? 'success' : 'muted'
}

function statusLabel(status: ProductStatus) {
  return status === 'ACTIVE' ? 'Đang bán' : 'Tạm ngưng'
}

export function ProductManagement() {
  const { items: products, loading, error, create, update, remove, reload } = useProducts()

  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL')

  const [editing, setEditing] = React.useState<Product | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null)

  const filtered = React.useMemo(() => {
    const q = normalize(query)
    return products.filter((p) => {
      const matchStatus = statusFilter === 'ALL' ? true : p.status === statusFilter
      const matchQuery =
        q.length === 0
          ? true
          : normalize(p.name).includes(q) || normalize(p.barcode).includes(q)
      return matchStatus && matchQuery
    })
  }, [products, query, statusFilter])

  const existingBarcodes = React.useMemo(() => {
    const set = new Set<string>()
    for (const p of products) set.add(normalize(p.barcode))
    return set
  }, [products])

  const openCreate = () => {
    setEditing(null)
    setCreateOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setCreateOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="grid gap-4 md:gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-tight sm:text-xl">
              Quản lý sản phẩm
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="mr-1.5 size-4" />
              Thêm sản phẩm
            </Button>
            <Button
              variant="outline"
              onClick={() => void reload()}
              className="w-full sm:w-auto"
            >
              Tải lại
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc barcode…"
              className="pl-9"
            />
          </div>

          <select
            className={cn(
              'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang bán</option>
            <option value="INACTIVE">Tạm ngưng</option>
          </select>
        </div>

        <div>
          <div className="hidden md:block">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {loading ? 'Đang tải…' : `Danh sách (${filtered.length})`}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    iPad/desktop: dạng bảng
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">ID</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="w-[180px]">Barcode</TableHead>
                      <TableHead className="w-[150px] text-right">Giá</TableHead>
                      <TableHead className="w-[140px]">Trạng thái</TableHead>
                      <TableHead className="w-[110px]">Auto</TableHead>
                      <TableHead className="w-[170px]">Cập nhật</TableHead>
                      <TableHead className="w-[150px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground">{p.id}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.barcode}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatVnd(p.price)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(p.status)}>
                            {statusLabel(p.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.isAutoCreated ? (
                            <Badge variant="secondary">Auto</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatUpdatedAt(p.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="mr-1.5 size-4" />
                              Sửa
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="mr-1.5 size-4" />
                              Xoá
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center">
                          <div className="text-sm text-muted-foreground">
                            Không có sản phẩm phù hợp.
                          </div>
                          <div className="mt-3">
                            <Button variant="outline" onClick={() => setQuery('')}>
                              Xoá bộ lọc
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="md:hidden">
            <div className="grid gap-3">
              {filtered.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate">{p.name}</CardTitle>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">
                          {p.barcode}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={statusBadgeVariant(p.status)}>{statusLabel(p.status)}</Badge>
                        {p.isAutoCreated && <Badge variant="secondary">Auto</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Giá</div>
                      <div className="text-base font-semibold tabular-nums">
                        {formatVnd(p.price)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">Cập nhật</div>
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {formatUpdatedAt(p.updatedAt)}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-end">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="mr-1.5 size-4" />
                      Sửa
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="mr-1.5 size-4" />
                      Xoá
                    </Button>
                  </CardFooter>
                </Card>
              ))}

              {filtered.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center">
                    <div className="text-sm text-muted-foreground">
                      Không có sản phẩm phù hợp.
                    </div>
                    <div className="mt-3">
                      <Button variant="outline" onClick={() => setQuery('')}>
                        Xoá bộ lọc
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

      <ProductFormModal
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditing(null)
          }
        }}
        editing={editing}
        existingBarcodes={existingBarcodes}
        onCreate={create}
        onUpdate={update}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null)
        }}
        title="Xác nhận xoá"
        description={
          deleteTarget ? (
            <span>
              Bạn chắc chắn muốn xoá{' '}
              <span className="font-medium text-foreground">{deleteTarget.name}</span>?
            </span>
          ) : null
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Xoá
            </Button>
          </div>
        }
        size="sm"
      >
        {deleteTarget && (
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Barcode</div>
              <div className="font-mono text-xs">{deleteTarget.barcode}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Giá</div>
              <div className="tabular-nums">{formatVnd(deleteTarget.price)}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
