import * as React from 'react'

import Scanner from '@/features/cart/components/Scanner'
import { useScannerSettings } from '@/features/cart/scanner-config'
import { CartScanList } from '@/features/cart/components/CartScanList'
import { Button } from '@/components/ui/button'
import { QuickCreateProductModal } from '@/features/cart/components/QuickCreateProductModal'
import type { CreateProductInput, Product } from '@/types/pos'
import { productService } from '@/services/productService'
import { ApiError } from '@/services/apiClient'
import { stopAllVideoStreamsUnderRoot } from '@/lib/camera-stream'

const ScanbotBarcodeScanner = React.lazy(
  () => import('@/features/cart/components/ScanbotBarcodeScanner'),
)

type ScannerMode = 'html5' | 'scanbot'

export default function CartPayment() {
  const scannerSettings = useScannerSettings()

  const [scannedProducts, setScannedProducts] = React.useState<Product[]>([])
  const [scanningLocked, setScanningLocked] = React.useState(false)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [pendingBarcode, setPendingBarcode] = React.useState<string | null>(null)
  const [scanError, setScanError] = React.useState<string | null>(null)
  const [scannerMode, setScannerMode] = React.useState<ScannerMode>('scanbot')

  const onScanbotInitFailed = React.useCallback(() => {
    setScannerMode('html5')
  }, [])

  // Khi vừa chuyển sang chế độ Camera nhanh, cần dừng stream camera cũ ngay (trước khi Scanner mount/start),
  // tránh html5-qrcode bị "AbortError" do race giữa dispose/unmount.
  React.useLayoutEffect(() => {
    if (scannerMode === 'html5') {
      stopAllVideoStreamsUnderRoot()
    }
  }, [scannerMode])

  /** Chạy trước useEffect cleanup của Scanner → dừng camera ngay khi thoát /cart. */
  React.useLayoutEffect(() => {
    return () => {
      stopAllVideoStreamsUnderRoot()
    }
  }, [])

  // Used to let Scanner resume only after modal create/close flow finishes.
  const scanProcessingResolveRef = React.useRef<null | (() => void)>(null)

  const vndFormatter = React.useMemo(
    () => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }),
    [],
  )
  const formatVnd = React.useCallback((amount: number) => vndFormatter.format(amount), [
    vndFormatter,
  ])

  const finishScanProcessing = React.useCallback(() => {
    scanProcessingResolveRef.current?.()
    scanProcessingResolveRef.current = null
  }, [])

  const openCreatePopup = React.useCallback((barcode: string, initialError?: string) => {
    setPendingBarcode(barcode)
    setScanError(initialError ?? null)
    setCreateOpen(true)
    setScanningLocked(true)

    return new Promise<void>((resolve) => {
      scanProcessingResolveRef.current = resolve
    })
  }, [])

  const onCreateProduct = React.useCallback(async (payload: CreateProductInput) => {
    const created = await productService.create(payload)
    setScannedProducts((prev) => [created, ...prev])
  }, [])

  const handleModalOpenChange = React.useCallback(
    (o: boolean) => {
      if (o) return
      setCreateOpen(false)
      setPendingBarcode(null)
      setScanError(null)
      setScanningLocked(false)
      finishScanProcessing()
    },
    [finishScanProcessing],
  )

  const handleScan = React.useCallback(
    async (code: string) => {
      if (scanningLocked) return

      try {
        const existing = await productService.getByBarcode(code)
        setScannedProducts((prev) => [existing, ...prev])

        // Ensure UI paint before allowing scanner to continue.
        await new Promise<void>((r) => window.requestAnimationFrame(() => r()))
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          await openCreatePopup(code)
          return
        }
        const msg = e instanceof Error ? e.message : 'Không thể kiểm tra barcode.'
        await openCreatePopup(code, msg)
      }
    },
    [openCreatePopup, scanningLocked],
  )

  return (
    <div className="grid gap-2 md:grid-cols-[1fr_420px] md:items-start md:gap-3">
      <div className="flex min-w-0 flex-col gap-2">
        <div
          className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-xs"
          role="group"
          aria-label="Chọn công cụ quét"
        >
          <span className="text-xs font-medium text-muted-foreground sm:text-sm">
            Chế độ quét
          </span>
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            <Button
              type="button"
              variant={scannerMode === 'html5' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-[min(var(--radius-md),10px)]"
              onClick={() => setScannerMode('html5')}
            >
              Camera nhanh
            </Button>
            <Button
              type="button"
              variant={scannerMode === 'scanbot' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-[min(var(--radius-md),10px)]"
              onClick={() => setScannerMode('scanbot')}
            >
              Scanbot
            </Button>
          </div>
        </div>
        {scannerMode === 'html5' ? (
          <Scanner onScan={handleScan} settings={scannerSettings} />
        ) : (
          <React.Suspense
            fallback={
              <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground shadow-xs">
                Đang tải Scanbot…
              </div>
            }
          >
            <ScanbotBarcodeScanner
              onScan={handleScan}
              onInitFailed={onScanbotInitFailed}
              settings={scannerSettings}
            />
          </React.Suspense>
        )}
      </div>

      <CartScanList
        products={scannedProducts}
        onClear={() => setScannedProducts([])}
        onDec={(productId) =>
          setScannedProducts((prev) => {
            const idx = prev.findIndex((p) => p.id === productId)
            if (idx < 0) return prev
            return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
          })
        }
        onInc={(productId) =>
          setScannedProducts((prev) => {
            const found = prev.find((p) => p.id === productId)
            if (!found) return prev
            // Append to keep existing group order stable.
            return [...prev, { ...found }]
          })
        }
        onRemoveLine={(productId) =>
          setScannedProducts((prev) => prev.filter((p) => p.id !== productId))
        }
        onUpdateUnitPrice={(productId, price) =>
          setScannedProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, price } : p)),
          )
        }
        formatVnd={formatVnd}
      />

      <QuickCreateProductModal
        open={createOpen}
        barcode={pendingBarcode}
        initialError={scanError}
        onOpenChange={handleModalOpenChange}
        onCreateProduct={onCreateProduct}
      />
    </div>
  )
}
