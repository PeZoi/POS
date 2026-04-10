import * as React from 'react'
import { Plus, Trash2, Pencil, RotateCcw, Search, Tag, Banknote, ArrowUpDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import type { CreateProductInput, Product } from '@/types/pos'
import { useProducts } from '@/features/products/hooks/useProducts'
import { ProductFormModal } from '@/features/products/components/ProductFormModal'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  normalizeProductSearchText,
  priceBoundsFromSearchParams,
  parsePriceSearchParam,
} from '@/features/products/utils/productSearch'
import { Input } from '@/components/ui/input'
import { digitsOnly, stripLeadingZeros } from '@/utils/priceDigits'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { ProductFiltersPanel, type StatusFilter } from '@/features/products/components/ProductFiltersPanel'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    amount,
  )
}

function formatVndCompact(amount: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.floor(amount)))
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

function statusFromSearchParams(sp: URLSearchParams): StatusFilter {
  return sp.get('status') === 'deleted' ? 'DELETED' : 'ACTIVE'
}

function setStatusOnParams(p: URLSearchParams, status: StatusFilter) {
  if (status === 'DELETED') p.set('status', 'deleted')
  else p.delete('status')
}

type SortBy = 'id' | 'price' | 'name' | 'updatedAt'
type SortDir = 'asc' | 'desc'

function sortFromSearchParams(sp: URLSearchParams): { sortBy: SortBy; sortDir: SortDir } {
  const rawBy = (sp.get('sortBy') ?? 'id').trim()
  const sortBy: SortBy =
    rawBy === 'price' ? 'price' : rawBy === 'name' ? 'name' : rawBy === 'updatedAt' ? 'updatedAt' : 'id'

  const rawDir = (sp.get('sortDir') ?? 'desc').trim().toLowerCase()
  const sortDir: SortDir = rawDir === 'asc' ? 'asc' : 'desc'

  return { sortBy, sortDir }
}

function setSortOnParams(p: URLSearchParams, sortBy: SortBy, sortDir: SortDir) {
  if (sortBy === 'id') {
    p.delete('sortBy')
    p.delete('sortDir')
    return
  }
  p.set('sortBy', sortBy)
  p.set('sortDir', sortDir)
}

export function ProductManagement() {
  const [searchParams, setSearchParams] = useSearchParams()

  const appliedQuery = React.useMemo(() => searchParams.get('q') ?? '', [searchParams])

  const statusFilter = React.useMemo(
    () => statusFromSearchParams(searchParams),
    [searchParams],
  )

  const priceBounds = React.useMemo(
    () => priceBoundsFromSearchParams(searchParams),
    [searchParams],
  )

  const appliedSort = React.useMemo(() => sortFromSearchParams(searchParams), [searchParams])

  const {
    items: products,
    loading,
    error,
    hasNext,
    create,
    update,
    remove,
    restore,
    reload,
    loadMore,
  } = useProducts({
    q: appliedQuery,
    deleted: statusFilter === 'DELETED',
    priceMin: priceBounds.min,
    priceMax: priceBounds.max,
    sortBy: appliedSort.sortBy,
    sortDir: appliedSort.sortDir,
    size: 20,
  })

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

  const [draftStatus, setDraftStatus] = React.useState<StatusFilter>(statusFilter)
  const [draftSortBy, setDraftSortBy] = React.useState<SortBy>(appliedSort.sortBy)
  const [draftSortDir, setDraftSortDir] = React.useState<SortDir>(appliedSort.sortDir)
  const [priceMinDraft, setPriceMinDraft] = React.useState(() => searchParams.get('priceMin') ?? '')
  const [priceMaxDraft, setPriceMaxDraft] = React.useState(() => searchParams.get('priceMax') ?? '')

  const [priceMinError, setPriceMinError] = React.useState<string | null>(null)
  const [priceMaxError, setPriceMaxError] = React.useState<string | null>(null)
  const [priceRangeError, setPriceRangeError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDraftStatus(statusFilter)
    setDraftSortBy(appliedSort.sortBy)
    setDraftSortDir(appliedSort.sortDir)
    setPriceMinDraft(searchParams.get('priceMin') ?? '')
    setPriceMaxDraft(searchParams.get('priceMax') ?? '')
    setPriceMinError(null)
    setPriceMaxError(null)
    setPriceRangeError(null)
  }, [searchParams, statusFilter, appliedSort])

  const validatePriceRangeDraft = React.useCallback((): { ok: true; min: number | null; max: number | null } | { ok: false } => {
    setPriceMinError(null)
    setPriceMaxError(null)
    setPriceRangeError(null)

    const minRaw = stripLeadingZeros(digitsOnly(priceMinDraft))
    const maxRaw = stripLeadingZeros(digitsOnly(priceMaxDraft))

    const MIN_MSG = 'Giá phải là số nguyên dương hoặc để trống.'
    const RANGE_MSG = 'Giá tối thiểu không được lớn hơn giá tối đa.'

    let minVal: number | null = null
    if (minRaw !== '') {
      const n = Number(minRaw)
      if (!Number.isFinite(n) || !Number.isSafeInteger(n) || n < 0) {
        setPriceMinError(MIN_MSG)
        return { ok: false }
      }
      minVal = n
    }

    let maxVal: number | null = null
    if (maxRaw !== '') {
      const n = Number(maxRaw)
      if (!Number.isFinite(n) || !Number.isSafeInteger(n) || n < 0) {
        setPriceMaxError(MIN_MSG)
        return { ok: false }
      }
      maxVal = n
    }

    if (minVal != null && maxVal != null && minVal > maxVal) {
      setPriceRangeError(RANGE_MSG)
      return { ok: false }
    }
    return { ok: true, min: minVal, max: maxVal }
  }, [priceMaxDraft, priceMinDraft])

  const hasActiveFilters = React.useMemo(() => {
    const q = normalizeProductSearchText(searchParams.get('q') ?? '')
    return (
      q.length > 0 ||
      statusFromSearchParams(searchParams) === 'DELETED' ||
      parsePriceSearchParam(searchParams.get('priceMin')) != null ||
      parsePriceSearchParam(searchParams.get('priceMax')) != null ||
      (searchParams.get('sortBy') != null && searchParams.get('sortBy') !== 'id')
    )
  }, [searchParams])

  const filterBadges = React.useMemo(() => {
    const badges: { key: string; label: string }[] = []

    const q = (searchParams.get('q') ?? '').trim()
    if (q) badges.push({ key: 'q', label: `Tìm: ${q}` })

    const st = statusFromSearchParams(searchParams)
    if (st === 'DELETED') badges.push({ key: 'status', label: 'Trạng thái: Đã xoá' })

    const min = parsePriceSearchParam(searchParams.get('priceMin'))
    const max = parsePriceSearchParam(searchParams.get('priceMax'))
    if (min != null && max != null) {
      badges.push({ key: 'price', label: `Giá: ${formatVndCompact(min)}–${formatVndCompact(max)}` })
    } else if (min != null) {
      badges.push({ key: 'priceMin', label: `Giá ≥ ${formatVndCompact(min)}` })
    } else if (max != null) {
      badges.push({ key: 'priceMax', label: `Giá ≤ ${formatVndCompact(max)}` })
    }

    const { sortBy, sortDir } = sortFromSearchParams(searchParams)
    if (sortBy !== 'id') {
      const byLabel =
        sortBy === 'price' ? 'Giá' : sortBy === 'name' ? 'Tên' : 'Ngày cập nhật'
      const dirLabel = sortDir === 'asc' ? 'tăng' : 'giảm'
      badges.push({ key: 'sort', label: `Sắp xếp: ${byLabel} ${dirLabel}` })
    }

    return badges
  }, [searchParams])

  const filterBadgeClass = React.useCallback((key: string) => {
    if (key === 'q') return 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30'
    if (key === 'status') return 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30'
    if (key === 'price' || key === 'priceMin' || key === 'priceMax') {
      return 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30'
    }
    return 'bg-muted text-foreground'
  }, [])

  const filterBadgeIcon = React.useCallback((key: string) => {
    if (key === 'q') return Search
    if (key === 'status') return Tag
    if (key === 'price' || key === 'priceMin' || key === 'priceMax') return Banknote
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
        p.delete('priceMin')
        p.delete('priceMax')
        p.delete('sortBy')
        p.delete('sortDir')
        return p
      },
      { replace: true },
    )
  }, [setSearchParams])

  const applyFilters = React.useCallback(() => {
    const r = validatePriceRangeDraft()
    if (!r.ok) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        setStatusOnParams(p, draftStatus)
        setSortOnParams(p, draftSortBy, draftSortBy === 'id' ? 'desc' : draftSortDir)
        if (r.min != null) p.set('priceMin', String(r.min))
        else p.delete('priceMin')
        if (r.max != null) p.set('priceMax', String(r.max))
        else p.delete('priceMax')
        return p
      },
      { replace: true },
    )
  }, [draftSortBy, draftSortDir, draftStatus, setSearchParams, validatePriceRangeDraft])

  const [editing, setEditing] = React.useState<Product | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null)

  /** Trên mobile: bộ lọc thu gọn mặc định, bấm icon mới mở. Desktop luôn hiện. */
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false)

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

        {error && (
          <div className="rounded-2xl border bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="Tìm theo tên hoặc barcode…"
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
                  <Badge
                    key={b.key}
                    variant="secondary"
                    className={cn(
                      'max-w-full border',
                      filterBadgeClass(b.key),
                    )}
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      {Icon && <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />}
                      <span className="truncate">{b.label}</span>
                    </span>
                  </Badge>
                )
              })}
            </div>
          )}

          <ProductFiltersPanel
            open={mobileFiltersOpen}
            onToggleOpen={() => setMobileFiltersOpen((o) => !o)}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onApply={applyFilters}
            draftStatus={draftStatus}
            onDraftStatusChange={setDraftStatus}
            draftSortBy={draftSortBy}
            onDraftSortByChange={(v) => setDraftSortBy(v as SortBy)}
            draftSortDir={draftSortDir}
            onDraftSortDirChange={(v) => setDraftSortDir(v as SortDir)}
            priceMinDraft={priceMinDraft}
            onPriceMinDraftChange={(next) => {
              setPriceMinError(null)
              setPriceRangeError(null)
              setPriceMinDraft(next)
            }}
            priceMaxDraft={priceMaxDraft}
            onPriceMaxDraftChange={(next) => {
              setPriceMaxError(null)
              setPriceRangeError(null)
              setPriceMaxDraft(next)
            }}
            priceMinError={priceMinError}
            priceMaxError={priceMaxError}
            priceRangeError={priceRangeError}
            onValidatePriceDraft={() => {
              void validatePriceRangeDraft()
            }}
          />
        </div>

        <div>
          <div className="hidden md:block">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{loading ? 'Đang tải…' : `Danh sách (${products.length})`}</CardTitle>
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
                    {products.map((p) => (
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

                    {products.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center">
                          <div className="text-sm text-muted-foreground">
                            Không có sản phẩm phù hợp.
                          </div>
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              onClick={() => setSearchText('')}
                            >
                              Xoá từ khoá tìm
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
              {products.map((p) => (
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

              {products.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center">
                    <div className="text-sm text-muted-foreground">
                      Không có sản phẩm phù hợp.
                    </div>
                    <div className="mt-3">
                      <Button variant="outline" onClick={() => setSearchText('')}>
                        Xoá từ khoá tìm
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
            {hasNext && (loading ? 'Đang tải…' : 'Đang tải thêm sản phẩm…')}
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
