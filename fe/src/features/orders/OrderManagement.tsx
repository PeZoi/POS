import * as React from 'react'
import { Plus, Search, Trash2, Pencil, Eye } from 'lucide-react'

import type { Order, OrderStatus, PaymentMethod, Product } from '@/types/pos'
import { useOrders } from '@/features/orders/hooks/useOrders'
import { useProducts } from '@/features/products/hooks/useProducts'
import type { CreateOrderInput } from '@/services/orderService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { OrderSearch } from '@/features/orders/components/OrderSearch'

type StatusFilter = 'ALL' | OrderStatus

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    amount,
  )
}

function formatCreatedAt(iso?: string) {
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

function statusBadgeVariant(status: OrderStatus | null) {
  if (status === 'PAID') return 'success'
  if (status === 'CANCELLED') return 'muted'
  return 'secondary'
}

function statusLabel(status: OrderStatus | null) {
  if (status === 'PAID') return 'Đã thanh toán'
  if (status === 'CANCELLED') return 'Đã huỷ'
  return 'Chờ thanh toán'
}

function paymentLabel(method: PaymentMethod | null) {
  if (method === 'CASH') return 'Tiền mặt'
  if (method === 'QR') return 'QR'
  if (method === 'CARD') return 'Thẻ'
  return '—'
}

type OrderFormValue = {
  paymentMethod: PaymentMethod | 'NONE'
  status: OrderStatus
  items: Array<{ productId: number | null; quantity: number }>
}

const emptyForm: OrderFormValue = {
  paymentMethod: 'NONE',
  status: 'PENDING',
  items: [{ productId: null, quantity: 1 }],
}

function validate(input: OrderFormValue) {
  const errors: Partial<Record<keyof OrderFormValue, string>> = {}
  const hasInvalidQty = input.items.some((it) => !Number.isInteger(it.quantity) || it.quantity < 1)
  const hasMissingProduct = input.items.some((it) => it.productId == null)
  if (input.items.length === 0) errors.items = 'Vui lòng thêm ít nhất 1 sản phẩm.'
  if (hasMissingProduct) errors.items = 'Vui lòng chọn sản phẩm cho tất cả dòng.'
  if (hasInvalidQty) errors.items = 'Số lượng phải là số nguyên >= 1.'
  return errors
}

function OrderForm({
  value,
  onChange,
  errors,
  products,
}: {
  value: OrderFormValue
  onChange: (next: OrderFormValue) => void
  errors: Partial<Record<keyof OrderFormValue, string>>
  products: Product[]
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="paymentMethod">Phương thức</Label>
          <select
            id="paymentMethod"
            className={cn(
              'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            value={value.paymentMethod}
            onChange={(e) =>
              onChange({ ...value, paymentMethod: e.target.value as PaymentMethod | 'NONE' })
            }
          >
            <option value="NONE">—</option>
            <option value="CASH">Tiền mặt</option>
            <option value="QR">QR</option>
            <option value="CARD">Thẻ</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Trạng thái</Label>
          <select
            id="status"
            className={cn(
              'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value as OrderStatus })}
          >
            <option value="PENDING">Chờ thanh toán</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="CANCELLED">Đã huỷ</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Sản phẩm</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                items: [...value.items, { productId: null, quantity: 1 }],
              })
            }
          >
            + Thêm dòng
          </Button>
        </div>

        <div className="grid gap-2">
          {value.items.map((it, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <select
                className={cn(
                  'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                )}
                value={it.productId ?? ''}
                onChange={(e) => {
                  const productId = e.target.value === '' ? null : Number(e.target.value)
                  const next = value.items.map((x, i) => (i === idx ? { ...x, productId } : x))
                  onChange({ ...value, items: next })
                }}
              >
                <option value="">Chọn sản phẩm…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              </select>

              <Input
                value={String(it.quantity)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '')
                  const q = raw === '' ? 1 : Number(raw)
                  const next = value.items.map((x, i) => (i === idx ? { ...x, quantity: q } : x))
                  onChange({ ...value, items: next })
                }}
                inputMode="numeric"
                placeholder="SL"
              />

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  const next = value.items.filter((_, i) => i !== idx)
                  onChange({ ...value, items: next })
                }}
              >
                Xoá
              </Button>
            </div>
          ))}
        </div>

        {errors.items && <div className="text-sm text-destructive">{errors.items}</div>}
      </div>
    </div>
  )
}

export function OrderManagement() {
  const {
    items: orders,
    loading,
    error,
    create,
    update,
    remove,
    reload,
    getById,
  } = useOrders()
  const { items: products, loading: productsLoading, error: productsError } = useProducts()

  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL')
  const [visibleCount, setVisibleCount] = React.useState(50)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)
  const [searchResults, setSearchResults] = React.useState<Order[] | null>(null)

  const [editing, setEditing] = React.useState<Order | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Order | null>(null)
  const [viewTarget, setViewTarget] = React.useState<Order | null>(null)

  const [formValue, setFormValue] = React.useState<OrderFormValue>(emptyForm)
  const [formErrors, setFormErrors] = React.useState<
    Partial<Record<keyof OrderFormValue, string>>
  >({})

  const filtered = React.useMemo(() => {
    const base: Order[] =
      debouncedQuery && searchResults !== null ? searchResults : orders
    const q = normalize(debouncedQuery)

    return base.filter((o) => {
      const matchStatus = statusFilter === 'ALL' ? true : o.status === statusFilter
      const matchQuery =
        q.length === 0
          ? true
          : String(o.orderCode ?? '').includes(q) || String(o.id).includes(q)
      return matchStatus && matchQuery
    })
  }, [orders, debouncedQuery, statusFilter, searchResults])

  const visible = React.useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  )

  React.useEffect(() => {
    setVisibleCount(50)
  }, [query, statusFilter, orders.length])

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

  const openCreate = () => {
    setEditing(null)
    setFormValue(emptyForm)
    setFormErrors({})
    setFormOpen(true)
  }

  const openEdit = (o: Order) => {
    setEditing(o)
    setFormValue({
      paymentMethod: o.paymentMethod ?? 'NONE',
      status: o.status ?? 'PENDING',
      items:
        o.items && o.items.length > 0
          ? o.items.map((it) => ({ productId: it.productId, quantity: it.quantity }))
          : [{ productId: null, quantity: 1 }],
    })
    setFormErrors({})
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const submitForm = async () => {
    const errors = validate(formValue)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const input: CreateOrderInput = {
      paymentMethod: formValue.paymentMethod === 'NONE' ? null : formValue.paymentMethod,
      status: formValue.status,
      items: formValue.items
        .filter((it) => it.productId != null)
        .map((it) => ({ productId: it.productId as number, quantity: it.quantity })),
    }

    if (!editing) {
      await create(input)
    } else {
      await update(editing.id, input)
      setEditing(null)
    }
    setFormOpen(false)
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
          <div className="text-lg font-semibold leading-tight sm:text-xl">Quản lý hoá đơn</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={openCreate}
            size="lg"
            className="w-full sm:w-auto rounded-xl px-5 text-base"
          >
            <Plus className="mr-1.5 size-4" />
            Tạo hoá đơn
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

      {(error || productsError || searchError) && (
        <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">
          {error ?? productsError ?? searchError}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <OrderSearch
            value={query}
            onValueChange={setQuery}
            status={statusFilter}
            limit={80}
            debounceMs={320}
            inputClassName="pl-9"
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
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">Chờ thanh toán</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="CANCELLED">Đã huỷ</option>
        </select>
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">Mã</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="w-[160px]">Trạng thái</TableHead>
              <TableHead className="w-[140px]">Thanh toán</TableHead>
              <TableHead className="text-right">Tổng tiền</TableHead>
              <TableHead className="w-[190px]">Ngày tạo</TableHead>
              <TableHead className="w-[220px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium tabular-nums">
                  #{o.orderCode ?? String(o.id)}
                </TableCell>
                <TableCell className="min-w-0">
                  <span className="block max-w-md truncate text-sm text-foreground">
                    {o.customerName && o.customerName.trim() !== '' ? o.customerName : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(o.status)}>{statusLabel(o.status)}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {paymentLabel(o.paymentMethod)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVnd(o.totalAmount ?? 0)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {formatCreatedAt(o.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const full = await getById(o.id)
                        setViewTarget(full)
                      }}
                    >
                      <Eye className="mr-1.5 size-4" />
                      Xem
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(o)}>
                      <Pencil className="mr-1.5 size-4" />
                      Sửa
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(o)}>
                      <Trash2 className="mr-1.5 size-4" />
                      Xoá
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <div className="text-sm text-muted-foreground">
                    {loading || searchLoading ? 'Đang tải…' : 'Không có hoá đơn phù hợp.'}
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
      </div>

      <div className="md:hidden">
        <div className="grid gap-3">
          {visible.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">
                      #{o.orderCode ?? String(o.id)}
                    </CardTitle>
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
                  <div className="text-base font-semibold tabular-nums">
                    {formatVnd(o.totalAmount ?? 0)}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">Khách hàng</div>
                  <div className="max-w-[70%] truncate text-sm text-muted-foreground">
                    {o.customerName && o.customerName.trim() !== '' ? o.customerName : '—'}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Thanh toán</div>
                  <div className="text-sm text-muted-foreground">{paymentLabel(o.paymentMethod)}</div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const full = await getById(o.id)
                    setViewTarget(full)
                  }}
                >
                  <Eye className="mr-1.5 size-4" />
                  Xem
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(o)}>
                  <Pencil className="mr-1.5 size-4" />
                  Sửa
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(o)}>
                  <Trash2 className="mr-1.5 size-4" />
                  Xoá
                </Button>
              </CardFooter>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <div className="text-sm text-muted-foreground">Không có hoá đơn phù hợp.</div>
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
        {visible.length < filtered.length && 'Đang tải thêm hoá đơn…'}
      </div>

      <Modal
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) closeForm()
        }}
        title={editing ? `Sửa hoá đơn #${editing.id}` : 'Tạo hoá đơn'}
        description="Tạo/Update sẽ gọi backend thật."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeForm}>
              Huỷ
            </Button>
            <Button onClick={submitForm}>{editing ? 'Lưu thay đổi' : 'Tạo hoá đơn'}</Button>
          </div>
        }
        size="lg"
      >
        <OrderForm
          value={formValue}
          onChange={setFormValue}
          errors={formErrors}
          products={products}
        />
        {productsLoading && (
          <div className="mt-3 text-sm text-muted-foreground">Đang tải danh sách sản phẩm…</div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null)
        }}
        title="Xác nhận xoá"
        description={
          deleteTarget ? (
            <span>
              Bạn chắc chắn muốn xoá hoá đơn{' '}
              <span className="font-medium text-foreground">
                #{deleteTarget.orderCode ?? String(deleteTarget.id)}
              </span>
              ?
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
              <div className="text-muted-foreground">Trạng thái</div>
              <div>
                <Badge variant={statusBadgeVariant(deleteTarget.status)}>
                  {statusLabel(deleteTarget.status)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Tổng tiền</div>
              <div className="tabular-nums">{formatVnd(deleteTarget.totalAmount ?? 0)}</div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(viewTarget)}
        onOpenChange={(o) => {
          if (!o) setViewTarget(null)
        }}
        title={
          viewTarget
            ? `Chi tiết hoá đơn #${viewTarget.orderCode ?? String(viewTarget.id)}`
            : 'Chi tiết hoá đơn'
        }
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Đóng
            </Button>
          </div>
        }
        size="lg"
      >
        {viewTarget && (
          <div className="grid gap-3">
            <div className="grid gap-2 rounded-xl border bg-muted/10 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-muted-foreground">Khách hàng</div>
                <div className="max-w-[70%] truncate text-right">
                  {viewTarget.customerName && viewTarget.customerName.trim() !== ''
                    ? viewTarget.customerName
                    : '—'}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Trạng thái</div>
                <Badge variant={statusBadgeVariant(viewTarget.status)}>
                  {statusLabel(viewTarget.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Thanh toán</div>
                <div>{paymentLabel(viewTarget.paymentMethod)}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Ngày tạo</div>
                <div className="tabular-nums">{formatCreatedAt(viewTarget.createdAt)}</div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">ID</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="w-[120px] text-right">Giá</TableHead>
                  <TableHead className="w-[120px] text-right">SL</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewTarget.items ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-muted-foreground">{it.productId}</TableCell>
                    <TableCell className="font-medium">{it.productName}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(it.price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(it.subtotal)}</TableCell>
                  </TableRow>
                ))}

                {(viewTarget.items ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Chưa có sản phẩm trong hoá đơn.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Modal>
    </div>
  )
}

