import * as React from 'react'
import { Plus, Search, Pencil, Eye, CreditCard, Tag, Banknote, ArrowUpDown } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
import { ApiError } from '@/services/apiClient'
import { toast } from 'sonner'
import { OrderPaymentDialog } from '@/features/orders/components/OrderPaymentDialog'
import {
  OrderFiltersPanel,
  type OrderSortBy,
  type OrderSortDir,
  type OrderStatusFilter,
} from '@/features/orders/components/OrderFiltersPanel'
import { digitsOnly, stripLeadingZeros } from '@/utils/priceDigits'

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

function formatVndCompact(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.floor(amount)))
}

function parseMoneyParam(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number(String(raw).replace(/\s/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

function statusFromSearchParams(sp: URLSearchParams): OrderStatusFilter {
  const s = (sp.get('status') ?? '').trim()
  if (s === 'PENDING') return 'PENDING'
  if (s === 'PARTIALLY_PAID') return 'PARTIALLY_PAID'
  if (s === 'PAID') return 'PAID'
  if (s === 'CANCELLED') return 'CANCELLED'
  return 'ALL'
}

function sortFromSearchParams(sp: URLSearchParams): { sortBy: OrderSortBy; sortDir: OrderSortDir } {
  const byRaw = (sp.get('sortBy') ?? 'id').trim()
  const sortBy: OrderSortBy =
    byRaw === 'totalAmount'
      ? 'totalAmount'
      : byRaw === 'customerName'
        ? 'customerName'
        : byRaw === 'createdAt'
          ? 'createdAt'
          : 'id'
  const dirRaw = (sp.get('sortDir') ?? 'desc').trim().toLowerCase()
  const sortDir: OrderSortDir = dirRaw === 'asc' ? 'asc' : 'desc'
  return { sortBy, sortDir }
}

function setStatusOnParams(p: URLSearchParams, status: OrderStatusFilter) {
  if (!status || status === 'ALL') p.delete('status')
  else p.set('status', status)
}

function setSortOnParams(p: URLSearchParams, sortBy: OrderSortBy, sortDir: OrderSortDir) {
  if (sortBy === 'id') {
    p.delete('sortBy')
    p.delete('sortDir')
    return
  }
  p.set('sortBy', sortBy)
  p.set('sortDir', sortDir)
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
  const [searchParams, setSearchParams] = useSearchParams()

  const appliedQuery = React.useMemo(() => searchParams.get('q') ?? '', [searchParams])
  const appliedStatus = React.useMemo(() => statusFromSearchParams(searchParams), [searchParams])
  const appliedSort = React.useMemo(() => sortFromSearchParams(searchParams), [searchParams])
  const appliedTotalMin = React.useMemo(() => parseMoneyParam(searchParams.get('totalMin')), [searchParams])
  const appliedTotalMax = React.useMemo(() => parseMoneyParam(searchParams.get('totalMax')), [searchParams])

  const {
    items: orders,
    loading,
    error,
    create,
    update,
    reload,
    hasNext,
    loadMore,
  } = useOrders({
    q: appliedQuery,
    status: appliedStatus === 'ALL' ? 'ALL' : appliedStatus,
    totalMin: appliedTotalMin,
    totalMax: appliedTotalMax,
    sortBy: appliedSort.sortBy,
    sortDir: appliedSort.sortDir,
    size: 20,
  })
  const { items: products, loading: productsLoading, error: productsError } = useProducts()

  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)

  const [searchText, setSearchText] = React.useState(appliedQuery)
  React.useEffect(() => {
    setSearchText(appliedQuery)
  }, [appliedQuery])

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchText.trim()
      const current = (searchParams.get('q') ?? '').trim()
      if (next === current) return
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next) p.set('q', next)
          else p.delete('q')
          return p
        },
        { replace: true },
      )
    }, 320)
    return () => window.clearTimeout(t)
  }, [searchParams, searchText, setSearchParams])

  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [draftStatus, setDraftStatus] = React.useState<OrderStatusFilter>(appliedStatus)
  const [draftSortBy, setDraftSortBy] = React.useState<OrderSortBy>(appliedSort.sortBy)
  const [draftSortDir, setDraftSortDir] = React.useState<OrderSortDir>(appliedSort.sortDir)
  const [totalMinDraft, setTotalMinDraft] = React.useState(() => searchParams.get('totalMin') ?? '')
  const [totalMaxDraft, setTotalMaxDraft] = React.useState(() => searchParams.get('totalMax') ?? '')

  const [totalMinError, setTotalMinError] = React.useState<string | null>(null)
  const [totalMaxError, setTotalMaxError] = React.useState<string | null>(null)
  const [totalRangeError, setTotalRangeError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDraftStatus(appliedStatus)
    setDraftSortBy(appliedSort.sortBy)
    setDraftSortDir(appliedSort.sortDir)
    setTotalMinDraft(searchParams.get('totalMin') ?? '')
    setTotalMaxDraft(searchParams.get('totalMax') ?? '')
    setTotalMinError(null)
    setTotalMaxError(null)
    setTotalRangeError(null)
  }, [appliedSort.sortBy, appliedSort.sortDir, appliedStatus, searchParams])

  const validateTotalDraft = React.useCallback((): { ok: true; min: number | null; max: number | null } | { ok: false } => {
    setTotalMinError(null)
    setTotalMaxError(null)
    setTotalRangeError(null)

    const MIN_MSG = 'Tổng tiền phải là số nguyên dương hoặc để trống.'
    const RANGE_MSG = 'Tổng tiền tối thiểu không được lớn hơn tối đa.'

    const minRaw = stripLeadingZeros(digitsOnly(totalMinDraft))
    const maxRaw = stripLeadingZeros(digitsOnly(totalMaxDraft))

    let minVal: number | null = null
    if (minRaw !== '') {
      const n = Number(minRaw)
      if (!Number.isFinite(n) || !Number.isSafeInteger(n) || n < 0) {
        setTotalMinError(MIN_MSG)
        return { ok: false }
      }
      minVal = n
    }

    let maxVal: number | null = null
    if (maxRaw !== '') {
      const n = Number(maxRaw)
      if (!Number.isFinite(n) || !Number.isSafeInteger(n) || n < 0) {
        setTotalMaxError(MIN_MSG)
        return { ok: false }
      }
      maxVal = n
    }

    if (minVal != null && maxVal != null && minVal > maxVal) {
      setTotalRangeError(RANGE_MSG)
      return { ok: false }
    }
    return { ok: true, min: minVal, max: maxVal }
  }, [totalMaxDraft, totalMinDraft])

  const hasActiveFilters = React.useMemo(() => {
    const q = normalize(searchParams.get('q') ?? '')
    return (
      q.length > 0 ||
      statusFromSearchParams(searchParams) !== 'ALL' ||
      parseMoneyParam(searchParams.get('totalMin')) != null ||
      parseMoneyParam(searchParams.get('totalMax')) != null ||
      (searchParams.get('sortBy') != null && searchParams.get('sortBy') !== 'id')
    )
  }, [searchParams])

  const filterBadges = React.useMemo(() => {
    const badges: { key: string; label: string }[] = []
    const q = (searchParams.get('q') ?? '').trim()
    if (q) badges.push({ key: 'q', label: `Tìm: ${q}` })

    const st = statusFromSearchParams(searchParams)
    if (st !== 'ALL') badges.push({ key: 'status', label: `Trạng thái: ${statusLabel(st)}` })

    const min = parseMoneyParam(searchParams.get('totalMin'))
    const max = parseMoneyParam(searchParams.get('totalMax'))
    if (min != null && max != null) badges.push({ key: 'total', label: `Tổng: ${formatVndCompact(min)}–${formatVndCompact(max)}` })
    else if (min != null) badges.push({ key: 'totalMin', label: `Tổng ≥ ${formatVndCompact(min)}` })
    else if (max != null) badges.push({ key: 'totalMax', label: `Tổng ≤ ${formatVndCompact(max)}` })

    const { sortBy, sortDir } = sortFromSearchParams(searchParams)
    if (sortBy !== 'id') {
      const byLabel = sortBy === 'totalAmount' ? 'Tổng tiền' : sortBy === 'customerName' ? 'Khách' : 'Ngày tạo'
      badges.push({ key: 'sort', label: `Sắp xếp: ${byLabel} ${sortDir === 'asc' ? 'tăng' : 'giảm'}` })
    }
    return badges
  }, [searchParams])

  const filterBadgeIcon = React.useCallback((key: string) => {
    if (key === 'q') return Search
    if (key === 'status') return Tag
    if (key === 'total' || key === 'totalMin' || key === 'totalMax') return Banknote
    if (key === 'sort') return ArrowUpDown
    return null
  }, [])

  const clearFilters = React.useCallback(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('status')
        p.delete('totalMin')
        p.delete('totalMax')
        p.delete('sortBy')
        p.delete('sortDir')
        return p
      },
      { replace: true },
    )
  }, [setSearchParams])

  const applyFilters = React.useCallback(() => {
    const r = validateTotalDraft()
    if (!r.ok) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        setStatusOnParams(p, draftStatus)
        setSortOnParams(p, draftSortBy, draftSortDir)
        if (r.min != null) p.set('totalMin', String(r.min))
        else p.delete('totalMin')
        if (r.max != null) p.set('totalMax', String(r.max))
        else p.delete('totalMax')
        return p
      },
      { replace: true },
    )
  }, [draftSortBy, draftSortDir, draftStatus, setSearchParams, validateTotalDraft])

  const [editing, setEditing] = React.useState<Order | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)

  const [payTarget, setPayTarget] = React.useState<Order | null>(null)
  const [payOpen, setPayOpen] = React.useState(false)
  const [paySubmitting, setPaySubmitting] = React.useState(false)

  const [formValue, setFormValue] = React.useState<OrderFormValue>(emptyForm)
  const [formErrors, setFormErrors] = React.useState<
    Partial<Record<keyof OrderFormValue, string>>
  >({})

  React.useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          void loadMore()
        }
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

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

      {(error || productsError) && (
        <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">
          {error ?? productsError}
        </div>
      )}

      <div className="grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Tìm theo mã, ID, tên khách, tổng tiền…"
            className="h-10 rounded-xl pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {filterBadges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filterBadges.map((b) => {
              const Icon = filterBadgeIcon(b.key)
              return (
                <Badge key={b.key} variant="secondary" className="max-w-full">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    {Icon && <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />}
                    <span className="truncate">{b.label}</span>
                  </span>
                </Badge>
              )
            })}
          </div>
        )}

        <OrderFiltersPanel
          open={filtersOpen}
          onToggleOpen={() => setFiltersOpen((o) => !o)}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onApply={applyFilters}
          draftStatus={draftStatus}
          onDraftStatusChange={setDraftStatus}
          draftSortBy={draftSortBy}
          onDraftSortByChange={setDraftSortBy}
          draftSortDir={draftSortDir}
          onDraftSortDirChange={setDraftSortDir}
          totalMinDraft={totalMinDraft}
          onTotalMinDraftChange={(next) => {
            setTotalMinError(null)
            setTotalRangeError(null)
            setTotalMinDraft(next)
          }}
          totalMaxDraft={totalMaxDraft}
          onTotalMaxDraftChange={(next) => {
            setTotalMaxError(null)
            setTotalRangeError(null)
            setTotalMaxDraft(next)
          }}
          totalMinError={totalMinError}
          totalMaxError={totalMaxError}
          totalRangeError={totalRangeError}
          onValidateTotalDraft={() => {
            void validateTotalDraft()
          }}
        />
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
            {orders.map((o) => (
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

            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <div className="text-sm text-muted-foreground">
                    {loading ? 'Đang tải…' : 'Không có hoá đơn phù hợp.'}
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" onClick={() => setSearchText('')}>
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
          {orders.map((o) => (
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

          {orders.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <div className="text-sm text-muted-foreground">Không có hoá đơn phù hợp.</div>
                <div className="mt-3">
                  <Button variant="outline" onClick={() => setSearchText('')}>
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
        {hasNext && (loading ? 'Đang tải…' : 'Đang tải thêm hoá đơn…')}
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

