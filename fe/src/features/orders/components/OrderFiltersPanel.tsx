import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CalendarClock,
  Filter,
  Hash,
  Tag,
  User,
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
import type { OrderStatus } from '@/types/pos'

export type OrderStatusFilter = 'ALL' | OrderStatus
export type OrderSortBy = 'id' | 'totalAmount' | 'customerName' | 'createdAt'
export type OrderSortDir = 'asc' | 'desc'

export type OrderFiltersPanelProps = {
  open: boolean
  onToggleOpen: () => void

  hasActiveFilters: boolean
  onClearFilters: () => void
  onApply: () => void

  draftStatus: OrderStatusFilter
  onDraftStatusChange: (next: OrderStatusFilter) => void

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
  draftStatus,
  onDraftStatusChange,
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

  const statusDisplay = React.useMemo(() => {
    if (draftStatus === 'ALL') return { Icon: Tag, label: 'Tất cả' }
    if (draftStatus === 'PENDING') return { Icon: Tag, label: 'Chờ thanh toán' }
    if (draftStatus === 'PARTIALLY_PAID') return { Icon: Tag, label: 'Thanh toán 1 phần' }
    if (draftStatus === 'PAID') return { Icon: Tag, label: 'Đã thanh toán' }
    return { Icon: Tag, label: 'Đã huỷ' }
  }, [draftStatus])

  const SortByIcon = sortByDisplay.Icon
  const SortDirIcon = sortDirDisplay.Icon
  const StatusIcon = statusDisplay.Icon

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
          <Select value={draftStatus} onValueChange={(v) => onDraftStatusChange(v as OrderStatusFilter)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue>
                <span className="inline-flex min-w-0 items-center gap-2">
                  <StatusIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{statusDisplay.label}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                <span className="inline-flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" aria-hidden />
                  Tất cả
                </span>
              </SelectItem>
              <SelectItem value="PENDING">
                <span className="inline-flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" aria-hidden />
                  Chờ thanh toán
                </span>
              </SelectItem>
              <SelectItem value="PARTIALLY_PAID">
                <span className="inline-flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" aria-hidden />
                  Thanh toán 1 phần
                </span>
              </SelectItem>
              <SelectItem value="PAID">
                <span className="inline-flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" aria-hidden />
                  Đã thanh toán
                </span>
              </SelectItem>
              <SelectItem value="CANCELLED">
                <span className="inline-flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" aria-hidden />
                  Đã huỷ
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
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

