import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarClock,
  Check,
  ChevronDown,
  Filter,
  Hash,
  User,
  Wallet,
  X,
} from 'lucide-react'
import * as React from 'react'
import { createPortal } from 'react-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'
import type { OrderStatus } from '@/types/pos'

export type OrderStatusFilter = OrderStatus
export type OrderSortBy = 'id' | 'totalAmount' | 'customerName' | 'createdAt'
export type OrderSortDir = 'asc' | 'desc'

const STATUS_FILTER_STYLE: Record<
  OrderStatus | 'ALL',
  { swatch: string; labelClass: string }
> = {
  ALL: {
    swatch: 'bg-muted-foreground/40 ring-1 ring-border',
    labelClass: 'text-foreground',
  },
  PENDING: {
    swatch: 'bg-sky-500 dark:bg-sky-400',
    labelClass: 'text-sky-800 dark:text-sky-200',
  },
  PARTIALLY_PAID: {
    swatch: 'bg-amber-500 dark:bg-amber-400',
    labelClass: 'text-amber-950 dark:text-amber-100',
  },
  PAID: {
    swatch: 'bg-emerald-600 dark:bg-emerald-500',
    labelClass: 'text-emerald-900 dark:text-emerald-100',
  },
  CANCELLED: {
    swatch: 'bg-rose-500 dark:bg-rose-400',
    labelClass: 'text-rose-950 dark:text-rose-100',
  },
}

const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'PARTIALLY_PAID', label: 'Thanh toán 1 phần' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
]

function useClickOutside(
  refs: Array<React.RefObject<HTMLElement | null>>,
  onOutside: () => void,
  enabled: boolean,
) {
  React.useEffect(() => {
    if (!enabled) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      const inside = refs.some((r) => r.current && r.current.contains(target))
      if (!inside) onOutside()
    }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('touchstart', onDown, true)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('touchstart', onDown, true)
    }
  }, [enabled, onOutside, refs])
}

function MultiStatusSelect({
  value,
  onChange,
  triggerContent,
}: {
  value: OrderStatusFilter[]
  onChange: (next: OrderStatusFilter[]) => void
  triggerContent: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)
  const [anchor, setAnchor] = React.useState<{ left: number; top: number; width: number } | null>(null)

  useClickOutside([triggerRef, panelRef], () => setOpen(false), open)

  const syncAnchor = React.useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setAnchor({
      left: r.left,
      top: r.top + r.height,
      width: r.width,
    })
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return
    syncAnchor()
  }, [open, syncAnchor])

  React.useEffect(() => {
    if (!open) return
    const onAny = () => syncAnchor()
    window.addEventListener('scroll', onAny, true)
    window.addEventListener('resize', onAny)
    return () => {
      window.removeEventListener('scroll', onAny, true)
      window.removeEventListener('resize', onAny)
    }
  }, [open, syncAnchor])

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const normalize = React.useCallback((next: OrderStatusFilter[]) => {
    const uniq = Array.from(new Set(next))
    // Chọn đủ 4 trạng thái thì tương đương "Tất cả" (clear filter)
    return uniq.length >= ORDER_STATUS_OPTIONS.length ? [] : uniq
  }, [])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1">{triggerContent}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open &&
        anchor &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: 'fixed',
              left: Math.max(8, Math.min(anchor.left, window.innerWidth - anchor.width - 8)),
              top: Math.max(8, Math.min(anchor.top + 8, window.innerHeight - 8)),
              width: Math.min(anchor.width, window.innerWidth - 16),
            }}
            className={cn(
              'z-50 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10',
            )}
          >
            <div className="max-h-[min(60vh,22rem)] overflow-auto p-1">
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                )}
                onClick={() => onChange([])}
              >
                <span className={cn('size-2.5 shrink-0 rounded-full', STATUS_FILTER_STYLE.ALL.swatch)} aria-hidden />
                <span className="flex-1 truncate font-medium">Tất cả</span>
                {value.length === 0 && <Check className="size-4 text-muted-foreground" aria-hidden />}
              </button>

              <div className="my-1 h-px bg-border" />

              {ORDER_STATUS_OPTIONS.map((opt) => {
                const selected = value.includes(opt.value)
                const style = STATUS_FILTER_STYLE[opt.value]
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                    )}
                    onClick={() => {
                      const next = selected ? value.filter((s) => s !== opt.value) : [...value, opt.value]
                    onChange(normalize(next))
                    }}
                  >
                    <span className={cn('size-2.5 shrink-0 rounded-full', style.swatch)} aria-hidden />
                    <span className={cn('flex-1 truncate font-medium', style.labelClass)}>{opt.label}</span>
                    {selected && <Check className="size-4 text-muted-foreground" aria-hidden />}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

export type OrderFiltersPanelProps = {
  open: boolean
  onToggleOpen: () => void

  hasActiveFilters: boolean
  onClearFilters: () => void
  onApply: () => void

  draftStatuses: OrderStatusFilter[]
  onDraftStatusesChange: (next: OrderStatusFilter[]) => void

  draftSortBy: OrderSortBy
  onDraftSortByChange: (next: OrderSortBy) => void
  draftSortDir: OrderSortDir
  onDraftSortDirChange: (next: OrderSortDir) => void

  totalMinDraft: string
  onTotalMinDraftChange: (next: string) => void
  totalMaxDraft: string
  onTotalMaxDraftChange: (next: string) => void

  totalMinError: string | null
  totalMaxError: string | null
  totalRangeError: string | null
  onValidateTotalDraft: () => void
}

export function OrderFiltersPanel({
  open,
  onToggleOpen,
  hasActiveFilters,
  onClearFilters,
  onApply,
  draftStatuses,
  onDraftStatusesChange,
  draftSortBy,
  onDraftSortByChange,
  draftSortDir,
  onDraftSortDirChange,
  totalMinDraft,
  onTotalMinDraftChange,
  totalMaxDraft,
  onTotalMaxDraftChange,
  totalMinError,
  totalMaxError,
  totalRangeError,
  onValidateTotalDraft,
}: OrderFiltersPanelProps) {
  const sortByDisplay = React.useMemo(() => {
    if (draftSortBy === 'id') return { Icon: Hash, label: 'Mới nhất' }
    if (draftSortBy === 'totalAmount') return { Icon: Wallet, label: 'Tổng tiền' }
    if (draftSortBy === 'customerName') return { Icon: User, label: 'Khách hàng' }
    return { Icon: CalendarClock, label: 'Ngày tạo' }
  }, [draftSortBy])

  const sortDirDisplay = React.useMemo(() => {
    return draftSortDir === 'asc'
      ? { Icon: ArrowUpNarrowWide, label: 'Tăng dần' }
      : { Icon: ArrowDownWideNarrow, label: 'Giảm dần' }
  }, [draftSortDir])

  const statusBadges = React.useMemo(() => {
    if (!draftStatuses || draftStatuses.length === 0) {
      return (
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <span className={cn('size-2.5 shrink-0 rounded-full', STATUS_FILTER_STYLE.ALL.swatch)} aria-hidden />
          <span className="truncate font-medium text-foreground">Tất cả</span>
        </span>
      )
    }

    const maxShow = 2
    const shown = draftStatuses.slice(0, maxShow)
    const rest = Math.max(0, draftStatuses.length - shown.length)

    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden">
        {shown.map((st) => {
          const label = ORDER_STATUS_OPTIONS.find((o) => o.value === st)?.label ?? String(st)
          const style = STATUS_FILTER_STYLE[st]
          return (
            <Badge key={st} variant="secondary" className="max-w-42">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span className={cn('size-2 shrink-0 rounded-full', style.swatch)} aria-hidden />
                <span className="truncate">{label}</span>
              </span>
            </Badge>
          )
        })}
        {rest > 0 && (
          <Badge variant="secondary" className="shrink-0">
            +{rest}
          </Badge>
        )}
      </span>
    )
  }, [draftStatuses])

  const SortByIcon = sortByDisplay.Icon
  const SortDirIcon = sortDirDisplay.Icon

  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Bộ lọc</CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-9 rounded-xl"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="mr-1.5 size-4" />
              Xoá bộ lọc
            </Button>
            <Button type="button" size="sm" className="h-9 rounded-xl" onClick={onApply}>
              Xác nhận
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-xl"
              aria-expanded={open}
              aria-controls="order-filters-panel"
              aria-label={open ? 'Đóng bộ lọc' : 'Mở bộ lọc'}
              onClick={onToggleOpen}
            >
              <Filter className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent
        id="order-filters-panel"
        className={cn('gap-4 pt-0 sm:grid-cols-2', open ? 'grid' : 'hidden md:grid')}
      >
        <div className="grid gap-2">
          <Label>Sắp xếp</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={draftSortBy} onValueChange={(v) => onDraftSortByChange(v as OrderSortBy)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue>
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <SortByIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{sortByDisplay.label}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">
                  <span className="inline-flex items-center gap-2">
                    <Hash className="size-4 text-muted-foreground" aria-hidden />
                    Mới nhất
                  </span>
                </SelectItem>
                <SelectItem value="totalAmount">
                  <span className="inline-flex items-center gap-2">
                    <Wallet className="size-4 text-muted-foreground" aria-hidden />
                    Tổng tiền
                  </span>
                </SelectItem>
                <SelectItem value="customerName">
                  <span className="inline-flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" aria-hidden />
                    Khách hàng
                  </span>
                </SelectItem>
                <SelectItem value="createdAt">
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
                    Ngày tạo
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={draftSortDir} onValueChange={(v) => onDraftSortDirChange(v as OrderSortDir)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue>
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <SortDirIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{sortDirDisplay.label}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">
                  <span className="inline-flex items-center gap-2">
                    <ArrowDownWideNarrow className="size-4 text-muted-foreground" aria-hidden />
                    Giảm dần
                  </span>
                </SelectItem>
                <SelectItem value="asc">
                  <span className="inline-flex items-center gap-2">
                    <ArrowUpNarrowWide className="size-4 text-muted-foreground" aria-hidden />
                    Tăng dần
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Trạng thái</Label>
          <MultiStatusSelect
            value={draftStatuses}
            onChange={onDraftStatusesChange}
            triggerContent={statusBadges}
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label>Tổng tiền (VND)</Label>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Từ"
                aria-invalid={Boolean(totalMinError || totalRangeError)}
                className={cn(
                  'tabular-nums',
                  (totalMinError || totalRangeError) &&
                    'border-destructive focus-visible:ring-destructive/40',
                )}
                value={
                  totalMinDraft === ''
                    ? ''
                    : formatThousandsComma(stripLeadingZeros(digitsOnly(totalMinDraft)))
                }
                onChange={(e) => {
                  const next = stripLeadingZeros(digitsOnly(e.target.value))
                  onTotalMinDraftChange(next)
                }}
                onBlur={() => onValidateTotalDraft()}
              />
              <span className="select-none text-sm text-muted-foreground">-</span>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Đến"
                aria-invalid={Boolean(totalMaxError || totalRangeError)}
                className={cn(
                  'tabular-nums',
                  (totalMaxError || totalRangeError) &&
                    'border-destructive focus-visible:ring-destructive/40',
                )}
                value={
                  totalMaxDraft === ''
                    ? ''
                    : formatThousandsComma(stripLeadingZeros(digitsOnly(totalMaxDraft)))
                }
                onChange={(e) => {
                  const next = stripLeadingZeros(digitsOnly(e.target.value))
                  onTotalMaxDraftChange(next)
                }}
                onBlur={() => onValidateTotalDraft()}
              />
            </div>
            {(totalMinError || totalMaxError) && (
              <div className="grid gap-1">
                {totalMinError && (
                  <p className="text-xs text-destructive" role="alert">
                    {totalMinError}
                  </p>
                )}
                {totalMaxError && (
                  <p className="text-xs text-destructive" role="alert">
                    {totalMaxError}
                  </p>
                )}
              </div>
            )}
          </div>
          {totalRangeError && (
            <p className="text-xs text-destructive" role="alert">
              {totalRangeError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

