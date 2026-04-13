import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Clock,
  Filter,
  Sparkles,
  Tag,
  Wallet,
  X,
} from 'lucide-react'
import * as React from 'react'

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

export type StatusFilter = 'ACTIVE' | 'DELETED'

const PRODUCT_STATUS_FILTER_STYLE: Record<StatusFilter, { swatch: string; labelClass: string }> = {
  ACTIVE: {
    swatch: 'bg-emerald-600 dark:bg-emerald-500',
    labelClass: 'text-emerald-900 dark:text-emerald-100',
  },
  DELETED: {
    swatch: 'bg-rose-500 dark:bg-rose-400',
    labelClass: 'text-rose-950 dark:text-rose-100',
  },
}

function ProductStatusSelectOption({ value, label }: { value: StatusFilter; label: string }) {
  const style = PRODUCT_STATUS_FILTER_STYLE[value]
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className={cn('size-2.5 shrink-0 rounded-full', style.swatch)} aria-hidden />
      <span className={cn('truncate font-medium', style.labelClass)}>{label}</span>
    </span>
  )
}

export type ProductFiltersPanelProps = {
  open: boolean
  onToggleOpen: () => void

  hasActiveFilters: boolean
  onClearFilters: () => void
  onApply: () => void

  draftStatus: StatusFilter
  onDraftStatusChange: (next: StatusFilter) => void

  draftSortBy: string
  onDraftSortByChange: (next: string) => void
  draftSortDir: string
  onDraftSortDirChange: (next: string) => void

  priceMinDraft: string
  onPriceMinDraftChange: (next: string) => void
  priceMaxDraft: string
  onPriceMaxDraftChange: (next: string) => void

  priceMinError: string | null
  priceMaxError: string | null
  priceRangeError: string | null
  onValidatePriceDraft: () => void
}

export function ProductFiltersPanel({
  open,
  onToggleOpen,
  hasActiveFilters,
  onClearFilters,
  onApply,
  draftStatus,
  onDraftStatusChange,
  draftSortBy,
  onDraftSortByChange,
  draftSortDir,
  onDraftSortDirChange,
  priceMinDraft,
  onPriceMinDraftChange,
  priceMaxDraft,
  onPriceMaxDraftChange,
  priceMinError,
  priceMaxError,
  priceRangeError,
  onValidatePriceDraft,
}: ProductFiltersPanelProps) {
  const sortByDisplay = React.useMemo(() => {
    if (draftSortBy === 'id') return { Icon: Sparkles, label: 'Mới nhất' }
    if (draftSortBy === 'price') return { Icon: Wallet, label: 'Giá' }
    if (draftSortBy === 'name') return { Icon: Tag, label: 'Tên' }
    return { Icon: Clock, label: 'Ngày cập nhật' }
  }, [draftSortBy])

  const sortDirDisplay = React.useMemo(() => {
    return draftSortDir === 'asc'
      ? { Icon: ArrowUpNarrowWide, label: 'Tăng dần' }
      : { Icon: ArrowDownWideNarrow, label: 'Giảm dần' }
  }, [draftSortDir])

  const statusDisplay = React.useMemo(() => {
    return draftStatus === 'DELETED'
      ? { label: 'Đã xoá' as const, filter: 'DELETED' as const }
      : { label: 'Đang bán' as const, filter: 'ACTIVE' as const }
  }, [draftStatus])

  const statusTriggerStyle = PRODUCT_STATUS_FILTER_STYLE[statusDisplay.filter]

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
              aria-controls="product-filters-panel"
              aria-label={open ? 'Đóng bộ lọc' : 'Mở bộ lọc'}
              onClick={onToggleOpen}
            >
              <Filter className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent
        id="product-filters-panel"
        className={cn('gap-4 pt-0 sm:grid-cols-2', open ? 'grid' : 'hidden md:grid')}
      >
        <div className="grid gap-2">
          <Label>Sắp xếp</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={draftSortBy} onValueChange={onDraftSortByChange}>
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
                    <Sparkles className="size-4 text-muted-foreground" aria-hidden />
                    Mới nhất
                  </span>
                </SelectItem>
                <SelectItem value="price">
                  <span className="inline-flex items-center gap-2">
                    <Wallet className="size-4 text-muted-foreground" aria-hidden />
                    Giá
                  </span>
                </SelectItem>
                <SelectItem value="name">
                  <span className="inline-flex items-center gap-2">
                    <Tag className="size-4 text-muted-foreground" aria-hidden />
                    Tên
                  </span>
                </SelectItem>
                <SelectItem value="updatedAt">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" aria-hidden />
                    Ngày cập nhật
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={draftSortDir}
              onValueChange={onDraftSortDirChange}
              disabled={draftSortBy === 'id'}
            >
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
          <Select value={draftStatus} onValueChange={(v) => onDraftStatusChange(v as StatusFilter)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                <span className="inline-flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn('size-2.5 shrink-0 rounded-full', statusTriggerStyle.swatch)}
                    aria-hidden
                  />
                  <span className={cn('truncate font-medium', statusTriggerStyle.labelClass)}>
                    {statusDisplay.label}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE" textValue="Đang bán">
                <ProductStatusSelectOption value="ACTIVE" label="Đang bán" />
              </SelectItem>
              <SelectItem value="DELETED" textValue="Đã xoá">
                <ProductStatusSelectOption value="DELETED" label="Đã xoá" />
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Giá (VND)</Label>
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Input
                id="product-price-min"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Giá từ"
                aria-invalid={Boolean(priceMinError || priceRangeError)}
                className={cn(
                  'tabular-nums',
                  (priceMinError || priceRangeError) &&
                    'border-destructive focus-visible:ring-destructive/40',
                )}
                value={
                  priceMinDraft === ''
                    ? ''
                    : formatThousandsComma(stripLeadingZeros(digitsOnly(priceMinDraft)))
                }
                onChange={(e) => {
                  const next = stripLeadingZeros(digitsOnly(e.target.value))
                  onPriceMinDraftChange(next)
                }}
                onBlur={() => onValidatePriceDraft()}
              />
              <span className="select-none text-sm text-muted-foreground">-</span>
              <Input
                id="product-price-max"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Giá đến"
                aria-invalid={Boolean(priceMaxError || priceRangeError)}
                className={cn(
                  'tabular-nums',
                  (priceMaxError || priceRangeError) &&
                    'border-destructive focus-visible:ring-destructive/40',
                )}
                value={
                  priceMaxDraft === ''
                    ? ''
                    : formatThousandsComma(stripLeadingZeros(digitsOnly(priceMaxDraft)))
                }
                onChange={(e) => {
                  const next = stripLeadingZeros(digitsOnly(e.target.value))
                  onPriceMaxDraftChange(next)
                }}
                onBlur={() => onValidatePriceDraft()}
              />
            </div>

            {(priceMinError || priceMaxError) && (
              <div className="grid gap-1">
                {priceMinError && (
                  <p className="text-xs text-destructive" role="alert">
                    {priceMinError}
                  </p>
                )}
                {priceMaxError && (
                  <p className="text-xs text-destructive" role="alert">
                    {priceMaxError}
                  </p>
                )}
              </div>
            )}
          </div>

          {priceRangeError && (
            <p className="text-xs text-destructive" role="alert">
              {priceRangeError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

