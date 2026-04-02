import * as React from 'react'

import Scanner from '@/features/cart/components/Scanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import type { CreateProductInput, Product } from '@/types/pos'
import { productService } from '@/services/productService'
import { ApiError } from '@/services/apiClient'

export default function CartPayment() {
  const [scannedProducts, setScannedProducts] = React.useState<Product[]>([])
  const [scanningLocked, setScanningLocked] = React.useState(false)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [pendingBarcode, setPendingBarcode] = React.useState<string | null>(null)
  const [draftName, setDraftName] = React.useState('')
  const [draftPriceRaw, setDraftPriceRaw] = React.useState('')
  const [createError, setCreateError] = React.useState<string | null>(null)
  const priceInputRef = React.useRef<HTMLInputElement | null>(null)

  const formatVnd = React.useCallback((amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      amount,
    )
  }, [])

  const openCreatePopup = React.useCallback((barcode: string) => {
    setPendingBarcode(barcode)
    setDraftName('')
    setDraftPriceRaw('')
    setCreateError(null)
    setCreateOpen(true)
    setScanningLocked(true)
  }, [])

  React.useEffect(() => {
    if (!createOpen) return
    const id = window.setTimeout(() => {
      priceInputRef.current?.focus()
    }, 50)
    return () => window.clearTimeout(id)
  }, [createOpen])

  const handleScan = React.useCallback((code: string) => {
    if (scanningLocked) return

    void (async () => {
      try {
        const existing = await productService.getByBarcode(code)
        setScannedProducts((prev) => [existing, ...prev])
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          openCreatePopup(code)
          return
        }
        setCreateError(e instanceof Error ? e.message : 'Không thể kiểm tra barcode.')
        openCreatePopup(code)
      }
    })()
  }, [openCreatePopup, scanningLocked])

  const parsedPrice = React.useMemo(() => {
    const digits = draftPriceRaw.replace(/[^\d]/g, '')
    if (digits.length === 0) return 0
    const n = Number(digits)
    return Number.isFinite(n) ? n : 0
  }, [draftPriceRaw])

  const confirmCreate = async () => {
    if (!pendingBarcode) return
    setCreateError(null)

    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      setCreateError('Vui lòng nhập giá > 0.')
      priceInputRef.current?.focus()
      return
    }

    const name =
      draftName.trim().length > 0
        ? draftName.trim()
        : `SP ${pendingBarcode.slice(-6) || pendingBarcode}`

    const payload: CreateProductInput = {
      name,
      barcode: pendingBarcode,
      price: parsedPrice,
      status: 'ACTIVE',
      isAutoCreated: true,
    }

    try {
      const created = await productService.create(payload)
      setScannedProducts((prev) => [created, ...prev])
      setCreateOpen(false)
      setPendingBarcode(null)
      setScanningLocked(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Không thể tạo sản phẩm.')
    }
  }

  return (
    <div className="grid gap-2 md:grid-cols-[1fr_420px] md:items-start md:gap-3">
      <Scanner onScan={handleScan} />

      <div className="-mt-2 mx-3 md:mx-0 md:mt-0 md:sticky md:top-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Giỏ hàng (scan)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScannedProducts([])}
                disabled={scannedProducts.length === 0}
              >
                Xoá hết
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Danh sách sản phẩm vừa quét (tự tạo nếu chưa có trong DB)
            </div>
          </CardHeader>
          <CardContent>
            {scannedProducts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Chưa có mã nào — hãy quét để thêm.
              </div>
            ) : (
              <div className="grid gap-2">
                {scannedProducts.map((p, idx) => (
                  <div
                    key={`${p.id}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        #{scannedProducts.length - idx} · {p.isAutoCreated ? 'Auto' : 'DB'}
                      </div>
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {p.barcode}
                        </div>
                        <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatVnd(p.price)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setScannedProducts((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Xoá
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={createOpen}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setPendingBarcode(null)
            setScanningLocked(false)
          }
        }}
        title="Chưa có sản phẩm — tạo nhanh"
        description={
          pendingBarcode ? (
            <span>
              Barcode: <span className="font-mono">{pendingBarcode}</span>
            </span>
          ) : null
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false)
                setPendingBarcode(null)
                setScanningLocked(false)
              }}
            >
              Huỷ
            </Button>
            <Button onClick={() => void confirmCreate()}>Xác nhận</Button>
          </div>
        }
        size="md"
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="newName">Tên (tuỳ chọn)</Label>
            <Input
              id="newName"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Có thể để trống"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPrice">Giá (VND)</Label>
            <Input
              id="newPrice"
              ref={priceInputRef}
              autoFocus
              value={draftPriceRaw}
              onChange={(e) => setDraftPriceRaw(e.target.value)}
              placeholder="Nhập giá…"
              inputMode="numeric"
              autoComplete="off"
            />
            <div className="text-sm text-muted-foreground">
              {parsedPrice > 0 ? formatVnd(parsedPrice) : '—'}
            </div>
          </div>

          {createError && (
            <div className="rounded-xl border bg-destructive/5 p-3 text-sm text-destructive">
              {createError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
