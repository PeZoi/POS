import * as React from 'react'
import { Plus, Trash2, Pencil, RotateCcw } from 'lucide-react'

import type { CreateProductInput, Product } from '@/types/pos'
import { useProducts } from '@/features/products/hooks/useProducts'
import { ProductFormModal } from '@/features/products/components/ProductFormModal'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { normalizeProductSearchText, productMatchesSearchQuery } from '@/features/products/utils/productSearch'
import { ProductSearch } from '@/features/products/components/ProductSearch'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

type StatusFilter = 'ACTIVE' | 'DELETED'

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

function deletedBadgeVariant(isDeleted: boolean) {
  return isDeleted ? 'destructive' : 'success'
}

function deletedLabel(isDeleted: boolean) {
  return isDeleted ? 'Đã xoá' : 'Đang bán'
}

export function ProductManagement() {
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ACTIVE')
  const { items: products, loading, error, create, update, remove, restore, reload } = useProducts({
    deleted: statusFilter === 'DELETED',
  })

  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [visibleCount, setVisibleCount] = React.useState(50)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)
  const [searchResults, setSearchResults] = React.useState<Product[] | null>(null)

  const [editing, setEditing] = React.useState<Product | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null)

  const filtered = React.useMemo(() => {
    const base: Product[] =
      debouncedQuery && searchResults !== null ? searchResults : products
    const q = normalizeProductSearchText(debouncedQuery)

    const list = base.filter((p) => {
      const matchStatus = statusFilter === 'DELETED' ? p.isDeleted : !p.isDeleted
      const matchQuery = productMatchesSearchQuery(p, q)
      return matchStatus && matchQuery
    })
    return list
  }, [products, debouncedQuery, statusFilter, searchResults])

  const visible = React.useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  )

  React.useEffect(() => {
    setVisibleCount(50)
  }, [query, statusFilter, products.length])

  React.useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    if (visible.length >= filtered.length) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev >= filtered.length) return prev
            return Math.min(prev + 50, filtered.length)
          })
        }
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [filtered.length, visible.length])

  const existingBarcodes = React.useMemo(() => {
    const set = new Set<string>()
    for (const p of products) set.add(normalizeProductSearchText(p.barcode))
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
    const name = deleteTarget.name
    await remove(deleteTarget.id)
    setDeleteTarget(null)
    toast.success(`Đã xoá ${name}`)
  }

  const onRestore = React.useCallback(async (p: Product) => {
    const ok = globalThis.confirm?.(
      `Khôi phục sản phẩm "${p.name}"?`,
    )
    if (!ok) return
    const restored = await restore(p.id)
    toast.success(`Đã khôi phục ${restored.name}`)
  }, [restore])

  const handleCreate = React.useCallback(async (input: CreateProductInput) => {
    const created = await create(input)
    toast.success(`Đã thêm ${created.name}`)
    return created
  }, [create])

  const handleUpdate = React.useCallback(async (id: number, input: CreateProductInput) => {
    const updated = await update(id, input)
    toast.success(`Đã cập nhật ${updated.name}`)
    return updated
  }, [update])

  return (
    <div className="grid gap-4 md:gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-semibold leading-tight sm:text-xl">
              Quản lý sản phẩm
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              onClick={openCreate}
              size="lg"
              className="w-full sm:w-auto rounded-xl px-5 text-base"
            >
              <Plus className="mr-1.5 size-4" />
              Thêm sản phẩm
            </Button>
            <Button
              variant="outline"
              onClick={() => void reload()}
              size="lg"
              className="w-full sm:w-auto rounded-xl px-5 text-base"
            >
              Tải lại
            </Button>
          </div>
        </div>

        {(error || searchError) && (
          <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">
            {error ?? searchError}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <ProductSearch
              value={query}
              onValueChange={setQuery}
              placeholder="Tìm theo tên hoặc barcode…"
              limit={100}
              debounceMs={320}
              inputClassName="pl-9"
              deleted={statusFilter === 'DELETED'}
              onStateChange={(s) => {
                setDebouncedQuery(s.debouncedQuery)
                setSearchLoading(s.loading)
                setSearchError(s.error)
                setSearchResults(s.debouncedQuery ? s.results : null)
              }}
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
            <option value="ACTIVE">Đang bán</option>
            <option value="DELETED">Đã xoá</option>
          </select>
        </div>

        <div>
          <div className="hidden md:block">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {loading || searchLoading ? 'Đang tải…' : `Danh sách (${filtered.length})`}
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
                    {visible.map((p) => (
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
                          <Badge variant={deletedBadgeVariant(p.isDeleted)}>
                            {deletedLabel(p.isDeleted)}
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
                            {statusFilter === 'ACTIVE' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget(p)}
                              >
                                <Trash2 className="mr-1.5 size-4" />
                                Xoá
                              </Button>
                            )}
                            {statusFilter === 'DELETED' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void onRestore(p)}
                              >
                                <RotateCcw className="mr-1.5 size-4" />
                                Khôi phục
                              </Button>
                            )}
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
              {visible.map((p) => (
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
                        <Badge variant={deletedBadgeVariant(p.isDeleted)}>{deletedLabel(p.isDeleted)}</Badge>
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
                    {statusFilter === 'ACTIVE' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="mr-1.5 size-4" />
                        Xoá
                      </Button>
                    )}
                    {statusFilter === 'DELETED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void onRestore(p)}
                      >
                        <RotateCcw className="mr-1.5 size-4" />
                        Khôi phục
                      </Button>
                    )}
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
          <div
            ref={loadMoreRef}
            className="mt-2 h-8 w-full text-center text-xs text-muted-foreground"
          >
            {visible.length < filtered.length && 'Đang tải thêm sản phẩm…'}
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
        onCreate={handleCreate}
        onUpdate={handleUpdate}
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
