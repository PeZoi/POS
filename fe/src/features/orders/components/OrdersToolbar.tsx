import * as React from 'react'
import { ArrowUpDown, Banknote, Search, Tag } from 'lucide-react'
import type { OrderStatus } from '@/types/pos'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  OrderFiltersPanel,
  type OrderSortBy,
  type OrderSortDir,
  type OrderStatusFilter,
} from '@/features/orders/components/OrderFiltersPanel'
import { formatVndCompact, normalize, parseMoneyParam, statusLabel } from '@/features/orders/orderManagementUtils'

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

export function OrdersToolbar({
  searchParams,
  setSearchParams,
  defaultOpenFilters = false,
}: {
  searchParams: URLSearchParams
  setSearchParams: (next: (prev: URLSearchParams) => URLSearchParams, opts?: { replace?: boolean }) => void
  defaultOpenFilters?: boolean
}) {
  const appliedQuery = React.useMemo(() => searchParams.get('q') ?? '', [searchParams])
  const appliedStatus = React.useMemo(() => statusFromSearchParams(searchParams), [searchParams])
  const appliedSort = React.useMemo(() => sortFromSearchParams(searchParams), [searchParams])

  const [filtersOpen, setFiltersOpen] = React.useState(defaultOpenFilters)
  const [searchText, setSearchText] = React.useState(appliedQuery)
  React.useEffect(() => setSearchText(appliedQuery), [appliedQuery])

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

    const minRaw = totalMinDraft.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
    const maxRaw = totalMaxDraft.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')

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
    if (st !== 'ALL') badges.push({ key: 'status', label: `Trạng thái: ${statusLabel(st as OrderStatus)}` })

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
    setSearchText('')
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('q')
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

  return (
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
  )
}

