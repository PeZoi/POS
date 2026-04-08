import * as React from 'react'
import { Plus, Search, Pencil, Eye, CreditCard } from 'lucide-react'

import type { Order, OrderPayment, OrderStatus, Product } from '@/types/pos'
import { useOrders } from '@/features/orders/hooks/useOrders'
import { useProducts } from '@/features/products/hooks/useProducts'
import { orderService, type CreateOrderInput, type CreateOrderPaymentInput } from '@/services/orderService'
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
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'

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
  const {
    items: orders,
    loading,
    error,
    create,
    update,
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
  const [viewTarget, setViewTarget] = React.useState<Order | null>(null)
  const [viewTab, setViewTab] = React.useState<'products' | 'payments'>('products')

  const [payments, setPayments] = React.useState<OrderPayment[] | null>(null)
  const [paymentsLoading, setPaymentsLoading] = React.useState(false)
  const [paymentsError, setPaymentsError] = React.useState<string | null>(null)

  const [payOpen, setPayOpen] = React.useState(false)
  const [payValue, setPayValue] = React.useState<CreateOrderPaymentInput>({
    amount: 0,
    note: null,
  })
  const [payAmountRaw, setPayAmountRaw] = React.useState('0')
  const [paySubmitting, setPaySubmitting] = React.useState(false)

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

  const canPay = React.useMemo(() => {
    if (!viewTarget) return false
    return viewTarget.status === 'PENDING' || viewTarget.status === 'PARTIALLY_PAID'
  }, [viewTarget])

  const remainingAmount = React.useMemo(() => {
    if (!viewTarget) return 0
    const total = Math.max(0, viewTarget.totalAmount ?? 0)
    const paid = Math.max(0, viewTarget.paidAmount ?? 0)
    return Math.max(0, total - paid)
  }, [viewTarget])

  const loadPayments = React.useCallback(
    async (orderId: number) => {
      setPaymentsLoading(true)
      setPaymentsError(null)
      try {
        const data = await orderService.listPayments(orderId)
        setPayments(data)
      } catch (e) {
        setPaymentsError(e instanceof Error ? e.message : 'Không thể tải lịch sử thanh toán.')
      } finally {
        setPaymentsLoading(false)
      }
    },
    [],
  )

  const openPaymentModal = React.useCallback(() => {
    if (!viewTarget) return
    setPayValue({ amount: remainingAmount, note: null })
    setPayAmountRaw(String(Math.max(0, Math.floor(remainingAmount))))
    setPayOpen(true)
  }, [remainingAmount, viewTarget])

  const openPaymentFromList = React.useCallback(
    async (orderId: number) => {
      const full = await getById(orderId)
      setViewTarget(full)
      setViewTab('products')
      setPayments(null)
      setPaymentsError(null)
      const remain = Math.max(0, (full.totalAmount ?? 0) - (full.paidAmount ?? 0))
      setPayValue({ amount: remain, note: null })
      setPayAmountRaw(String(Math.max(0, Math.floor(remain))))
      setPayOpen(true)
    },
    [getById],
  )

  const submitPayment = React.useCallback(async () => {
    if (!viewTarget) return
    const digits = stripLeadingZeros(digitsOnly(payAmountRaw))
    const amount = digits.length ? Number(digits) : 0
    if (amount < 1) {
      globalThis.alert?.('Số tiền thanh toán phải >= 1.')
      return
    }
    if (amount > remainingAmount) {
      globalThis.alert?.(`Số tiền thanh toán vượt quá số tiền còn lại: ${formatVnd(remainingAmount)}`)
      return
    }

    setPaySubmitting(true)
    try {
      const updated = await orderService.addPayment(viewTarget.id, {
        amount,
        note: payValue.note ?? null,
      })
      setViewTarget(updated)
      setPayOpen(false)
      setPayAmountRaw('0')
      await loadPayments(viewTarget.id)
      await reload()
    } catch (e) {
      const msg =
        e instanceof ApiError || e instanceof Error ? e.message : 'Không thể ghi nhận thanh toán.'
      globalThis.alert?.(msg)
    } finally {
      setPaySubmitting(false)
    }
  }, [loadPayments, payAmountRaw, payValue.note, reload, remainingAmount, viewTarget])

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
                  <div className="inline-flex gap-2">
                    {(o.status === 'PENDING' || o.status === 'PARTIALLY_PAID') && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          void openPaymentFromList(o.id)
                        }}
                      >
                        <CreditCard className="mr-1.5 size-4" />
                        Thanh toán
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const full = await getById(o.id)
                        setViewTarget(full)
                        setViewTab('products')
                        setPayments(null)
                        setPaymentsError(null)
                      }}
                    >
                      <Eye className="mr-1.5 size-4" />
                      Xem
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(o)}>
                      <Pencil className="mr-1.5 size-4" />
                      Sửa
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
                  <div className="text-sm text-muted-foreground">Đã thanh toán</div>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {paidAmountLabel(o.paidAmount, o.totalAmount)}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                {(o.status === 'PENDING' || o.status === 'PARTIALLY_PAID') && (
                  <Button
                    size="sm"
                    onClick={() => {
                      void openPaymentFromList(o.id)
                    }}
                  >
                    <CreditCard className="mr-1.5 size-4" />
                    Thanh toán
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const full = await getById(o.id)
                    setViewTarget(full)
                    setViewTab('products')
                    setPayments(null)
                    setPaymentsError(null)
                  }}
                >
                  <Eye className="mr-1.5 size-4" />
                  Xem
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(o)}>
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
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" size="lg" onClick={() => setViewTarget(null)}>
              Đóng
            </Button>
            {canPay && (
              <Button size="lg" onClick={openPaymentModal}>
                <CreditCard className="mr-2 size-5" />
                Thanh toán
              </Button>
            )}
          </div>
        }
        size="lg"
      >
        {viewTarget && (
          <div className="grid gap-3">
            <div className="grid gap-3 rounded-xl border bg-muted/10 p-3 text-sm">
              <div className="rounded-lg border bg-background/60 p-3">
                <div className="text-xs font-medium text-muted-foreground">Tổng tiền hoá đơn</div>
                <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-primary">
                  {formatVnd(viewTarget.totalAmount ?? 0)}
                </div>
              </div>

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
                <div className="text-muted-foreground">Đã thanh toán</div>
                <div className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {paidAmountLabel(viewTarget.paidAmount, viewTarget.totalAmount)}
                </div>
              </div>
              {remainingAmount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground">Còn lại</div>
                  <div className="font-semibold tabular-nums text-destructive">
                    {formatVnd(remainingAmount)}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Ngày tạo</div>
                <div className="tabular-nums">{formatCreatedAt(viewTarget.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={viewTab === 'products' ? 'default' : 'outline'}
                size="default"
                onClick={() => setViewTab('products')}
              >
                Sản phẩm
              </Button>
              <Button
                type="button"
                variant={viewTab === 'payments' ? 'default' : 'outline'}
                size="default"
                onClick={async () => {
                  setViewTab('payments')
                  if (payments == null && !paymentsLoading) await loadPayments(viewTarget.id)
                }}
              >
                Lịch sử thanh toán
              </Button>
            </div>

            {viewTab === 'products' ? (
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
            ) : (
              <div className="grid gap-2">
                {(paymentsError || paymentsLoading) && (
                  <div className="rounded-xl border bg-muted/10 p-3 text-sm text-muted-foreground">
                    {paymentsLoading ? 'Đang tải lịch sử thanh toán…' : paymentsError}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Thời gian</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payments ?? []).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatCreatedAt(p.createdAt)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatVnd(p.amount)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.note && p.note.trim() !== '' ? p.note : '—'}
                        </TableCell>
                      </TableRow>
                    ))}

                    {(payments ?? []).length === 0 && !paymentsLoading && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                          Chưa có lịch sử thanh toán.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={payOpen}
        onOpenChange={(o) => {
          if (!o) setPayOpen(false)
        }}
        title={viewTarget ? `Thanh toán hoá đơn #${viewTarget.orderCode ?? String(viewTarget.id)}` : 'Thanh toán'}
        description="Bạn có thể thanh toán nhiều đợt; hệ thống sẽ lưu lịch sử từng lần."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size="default"
              className="w-full sm:w-auto"
              onClick={() => setPayOpen(false)}
              disabled={paySubmitting}
            >
              Huỷ
            </Button>
            <Button
              size="default"
              className="w-full sm:w-auto"
              onClick={submitPayment}
              disabled={paySubmitting || !viewTarget}
            >
              Ghi nhận thanh toán
            </Button>
          </div>
        }
        size="sm"
      >
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="payAmount">Số tiền</Label>
            <Input
              id="payAmount"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              spellCheck={false}
              className="tabular-nums"
              value={payAmountRaw === '' ? '' : formatThousandsComma(payAmountRaw)}
              onChange={(e) => {
                const next = stripLeadingZeros(digitsOnly(e.target.value))
                setPayAmountRaw(next === '0' ? '0' : next)
                const n = next.length ? Number(next) : 0
                setPayValue((prev) => ({ ...prev, amount: n }))
              }}
              onBlur={(e) => {
                const digits = digitsOnly(e.currentTarget.value)
                if (digits === '') {
                  setPayAmountRaw('0')
                  setPayValue((prev) => ({ ...prev, amount: 0 }))
                }
              }}
              placeholder="Nhập số tiền…"
            />
            {viewTarget && (
              <div className="text-xs text-muted-foreground">
                Còn lại: <span className="tabular-nums">{formatVnd(remainingAmount)}</span>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="payNote">Ghi chú</Label>
            <Input
              id="payNote"
              value={payValue.note ?? ''}
              onChange={(e) => setPayValue((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Ghi chú"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

