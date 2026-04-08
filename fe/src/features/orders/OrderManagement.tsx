import * as React from 'react'
import { Plus, Search, Pencil, Eye, CreditCard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { Order, OrderStatus, Product } from '@/types/pos'
import { useOrders } from '@/features/orders/hooks/useOrders'
import { useProducts } from '@/features/products/hooks/useProducts'
import { orderService, type CreateOrderInput } from '@/services/orderService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { OrderSearch } from '@/features/orders/components/OrderSearch'
import { ApiError } from '@/services/apiClient'
import { toast } from 'sonner'
import { OrderPaymentDialog } from '@/features/orders/components/OrderPaymentDialog'

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
  if (status === 'PARTIALLY_PAID') return 'warning'
  if (status === 'CANCELLED') return 'muted'
  return 'secondary'
}

function statusLabel(status: OrderStatus | null) {
  if (status === 'PAID') return 'Đã thanh toán'
  if (status === 'PARTIALLY_PAID') return 'Thanh toán 1 phần'
  if (status === 'CANCELLED') return 'Đã huỷ'
  return 'Chờ thanh toán'
}

function paidAmountLabel(paidAmount: number | null | undefined, totalAmount: number | null | undefined) {
  const paid = paidAmount == null ? null : Math.max(0, Math.floor(paidAmount))
  const total = totalAmount == null ? null : Math.max(0, Math.floor(totalAmount))
  if (paid == null) return '—'
  if (total != null && paid > total) return formatVnd(total)
  return formatVnd(paid)
}

type OrderFormValue = {
  status: OrderStatus
  items: Array<{ productId: number | null; quantity: number }>
}

const emptyForm: OrderFormValue = {
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
      <div className="grid gap-2 sm:max-w-xs">
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
  const navigate = useNavigate()
  const {
    items: orders,
    loading,
    error,
    create,
    update,
    reload,
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

  const [payTarget, setPayTarget] = React.useState<Order | null>(null)
  const [payOpen, setPayOpen] = React.useState(false)
  const [paySubmitting, setPaySubmitting] = React.useState(false)

  const [formValue, setFormValue] = React.useState<OrderFormValue>(emptyForm)
  const [formErrors, setFormErrors] = React.useState<
    Partial<Record<keyof OrderFormValue, string>>
  >({})

  const filtered = React.useMemo(() => {
    const base: Order[] =
      debouncedQuery && searchResults !== null ? searchResults : orders
    const q = normalize(debouncedQuery)
    /** Kết quả đã lọc từ API — không lọc lại theo mã/id (tránh mất kết quả tìm theo tên khách / tổng tiền). */
    const trustServerResults = Boolean(debouncedQuery && searchResults !== null)

    return base.filter((o) => {
      const matchStatus = statusFilter === 'ALL' ? true : o.status === statusFilter
      const matchQuery =
        q.length === 0
          ? true
          : trustServerResults
            ? true
            : String(o.orderCode ?? '').includes(q) ||
              String(o.id).includes(q) ||
              normalize(o.customerName ?? '').includes(q) ||
              String(o.totalAmount ?? '') === q
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

  const openPayFromList = React.useCallback((o: Order) => {
    setPayTarget(o)
    setPayOpen(true)
  }, [])

  const submitPayment = React.useCallback(async (payload: { amount: number; note: string | null }) => {
    if (!payTarget) return
    const total = Math.max(0, payTarget.totalAmount ?? 0)
    const paid = Math.max(0, payTarget.paidAmount ?? 0)
    const remain = Math.max(0, total - paid)
    const amount = payload.amount

    if (amount < 1) {
      globalThis.alert?.('Số tiền thanh toán phải >= 1.')
      return
    }
    if (amount > remain) {
      globalThis.alert?.(`Số tiền thanh toán vượt quá số tiền còn lại: ${formatVnd(remain)}`)
      return
    }

    setPaySubmitting(true)
    try {
      await orderService.addPayment(payTarget.id, { amount, note: payload.note ?? null })
      toast.success('Thanh toán thành công', { description: `Đã ghi nhận ${formatVnd(amount)}` })
      setPayOpen(false)
      setPayTarget(null)
      await reload()
    } catch (e) {
      const msg = e instanceof ApiError || e instanceof Error ? e.message : 'Không thể ghi nhận thanh toán.'
      globalThis.alert?.(msg)
    } finally {
      setPaySubmitting(false)
    }
  }, [payTarget, reload])

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
          <option value="PARTIALLY_PAID">Thanh toán 1 phần</option>
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
              <TableHead className="w-[170px] text-right">Đã thanh toán</TableHead>
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
                <TableCell className="text-right tabular-nums">
                  {paidAmountLabel(o.paidAmount, o.totalAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatVnd(o.totalAmount ?? 0)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {formatCreatedAt(o.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-col items-end gap-2">
                    <div className="flex w-full justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        <Eye className="mr-1.5 size-4" />
                        Xem
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(o)}>
                        <Pencil className="mr-1.5 size-4" />
                        Sửa
                      </Button>
                    </div>

                    {(o.status === 'PENDING' || o.status === 'PARTIALLY_PAID') && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          openPayFromList(o)
                        }}
                      >
                        <CreditCard className="mr-1.5 size-4" />
                        Thanh toán
                      </Button>
                    )}
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
                  <div className="text-sm text-muted-foreground">Đã thanh toán</div>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {paidAmountLabel(o.paidAmount, o.totalAmount)}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-row gap-2">
                {(o.status === 'PENDING' || o.status === 'PARTIALLY_PAID') && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      openPayFromList(o)
                    }}
                  >
                    <CreditCard className="mr-1.5 size-4" />
                    Thanh toán
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/orders/${o.id}`)}
                >
                  <Eye className="mr-1.5 size-4" />
                  Xem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(o)}
                >
                  <Pencil className="mr-1.5 size-4" />
                  Sửa
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
        title={editing ? `Sửa hoá đơn #${editing?.orderCode ?? String(editing?.id)}` : 'Tạo hoá đơn'}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeForm}>
              Huỷ
            </Button>
            <Button onClick={submitForm}>{editing ? 'Cập nhật' : 'Tạo hoá đơn'}</Button>
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

      <OrderPaymentDialog
        open={payOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPayOpen(false)
            setPayTarget(null)
          } else {
            setPayOpen(true)
          }
        }}
        title={
          payTarget
            ? `Thanh toán hoá đơn #${payTarget.orderCode ?? String(payTarget.id)}`
            : 'Thanh toán'
        }
        description="Thanh toán trực tiếp từ danh sách hoá đơn."
        remainingAmount={Math.max(
          0,
          (payTarget?.totalAmount ?? 0) - (payTarget?.paidAmount ?? 0),
        )}
        defaultAmount={Math.max(
          0,
          (payTarget?.totalAmount ?? 0) - (payTarget?.paidAmount ?? 0),
        )}
        submitting={paySubmitting}
        onSubmit={submitPayment}
      />

    </div>
  )
}

