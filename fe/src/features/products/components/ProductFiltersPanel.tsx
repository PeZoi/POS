import { Filter, X } from 'lucide-react'

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

export type StatusFilter = 'ACTIVE' | 'DELETED'

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
  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Filter className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Bộ lọc</CardTitle>
            {hasActiveFilters && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                Đang lọc
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
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
        className={cn('gap-4 pt-0 sm:grid-cols-2', open ? 'grid' : 'hidden')}
      >
        <div className="grid gap-2">
          <Label>Sắp xếp</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={draftSortBy} onValueChange={onDraftSortByChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Giá trị" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Mới nhất</SelectItem>
                <SelectItem value="price">Giá</SelectItem>
                <SelectItem value="name">Tên</SelectItem>
                <SelectItem value="updatedAt">Ngày cập nhật</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={draftSortDir}
              onValueChange={onDraftSortDirChange}
              disabled={draftSortBy === 'id'}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Tăng/giảm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Giảm dần</SelectItem>
                <SelectItem value="asc">Tăng dần</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Trạng thái</Label>
          <Select value={draftStatus} onValueChange={(v) => onDraftStatusChange(v as StatusFilter)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Đang bán</SelectItem>
              <SelectItem value="DELETED">Đã xoá</SelectItem>
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

