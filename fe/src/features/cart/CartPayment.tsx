import * as React from 'react'

import { cartGrandTotal } from '@/features/cart/cart-lines'
import Scanner from '@/features/cart/components/Scanner'
import PyBarcodeScanner from '@/features/cart/components/PyBarcodeScanner'
import { useScannerSettings } from '@/features/cart/scanner-config'
import { CartScanList } from '@/features/cart/components/CartScanList'
import { ScannerModeMenu } from '@/features/cart/components/ScannerModeMenu'
import type { ScannerModeId } from '@/features/cart/scanner-mode'
import { QuickCreateProductModal } from '@/features/cart/components/QuickCreateProductModal'
import type { CreateProductInput, Product } from '@/types/pos'
import { productService } from '@/services/productService'
import { ApiError } from '@/services/apiClient'
import { stopAllVideoStreamsUnderRoot } from '@/lib/camera-stream'
import { cn } from '@/lib/utils'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const ScanbotBarcodeScanner = React.lazy(
  () => import('@/features/cart/components/ScanbotBarcodeScanner'),
)

export default function CartPayment() {
  const scannerSettings = useScannerSettings()

  const [scannedProducts, setScannedProducts] = React.useState<Product[]>([])
  const [scanningLocked, setScanningLocked] = React.useState(false)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [pendingBarcode, setPendingBarcode] = React.useState<string | null>(null)
  const [scanError, setScanError] = React.useState<string | null>(null)
  const [scannerMode, setScannerMode] = React.useState<ScannerModeId>('scanbot')
  const [draftPrices, setDraftPrices] = React.useState<Record<number, string>>({})
  const [cartToastName, setCartToastName] = React.useState<string | null>(null)
  const [cartToastExiting, setCartToastExiting] = React.useState(false)
  const [cartToastNonce, setCartToastNonce] = React.useState(0)
  const cartToastHideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const cartToastRemoveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCartToastTimers = React.useCallback(() => {
    if (cartToastHideTimerRef.current) {
      clearTimeout(cartToastHideTimerRef.current)
      cartToastHideTimerRef.current = null
    }
    if (cartToastRemoveTimerRef.current) {
      clearTimeout(cartToastRemoveTimerRef.current)
      cartToastRemoveTimerRef.current = null
    }
  }, [])

  const showAddedToCartToast = React.useCallback(
    (productName: string) => {
      clearCartToastTimers()
      setCartToastExiting(false)
      setCartToastNonce((n) => n + 1)
      setCartToastName(productName)
      cartToastHideTimerRef.current = setTimeout(() => {
        setCartToastExiting(true)
        cartToastRemoveTimerRef.current = setTimeout(() => {
          setCartToastName(null)
          setCartToastExiting(false)
          cartToastRemoveTimerRef.current = null
        }, 320)
        cartToastHideTimerRef.current = null
      }, 1000)
    },
    [clearCartToastTimers],
  )

  React.useEffect(() => {
    return () => {
      clearCartToastTimers()
    }
  }, [clearCartToastTimers])

  const onScanbotInitFailed = React.useCallback(() => {
    setScannerMode('python')
  }, [])

  // Khi vừa chuyển sang chế độ Camera nhanh, cần dừng stream camera cũ ngay (trước khi Scanner mount/start),
  // tránh html5-qrcode bị "AbortError" do race giữa dispose/unmount.
  React.useLayoutEffect(() => {
    if (scannerMode === 'html5' || scannerMode === 'python') {
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

  const cartTotal = React.useMemo(
    () => cartGrandTotal(scannedProducts, draftPrices),
    [scannedProducts, draftPrices],
  )

  const onDraftPriceChange = React.useCallback((productId: number, raw: string) => {
    setDraftPrices((prev) => ({ ...prev, [productId]: raw }))
  }, [])

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

  const onCreateProduct = React.useCallback(
    async (payload: CreateProductInput) => {
      const created = await productService.create(payload)
      setScannedProducts((prev) => [created, ...prev])
      showAddedToCartToast(created.name)
    },
    [showAddedToCartToast],
  )

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
        setScannedProducts((prev) => {
          const already = prev.some((p) => p.id === existing.id)
          // Trùng mã: chỉ tăng SL, giữ thứ tự dòng (first-occurrence trong cart-lines).
          if (already) return [...prev, { ...existing }]
          return [existing, ...prev]
        })
        showAddedToCartToast(existing.name)

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
    [openCreatePopup, scanningLocked, showAddedToCartToast],
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {cartToastName && (
        <div
          className="pointer-events-none fixed left-1/2 top-[calc(0.65rem+env(safe-area-inset-top))] z-100 flex w-full max-w-full -translate-x-1/2 justify-center px-3"
          role="status"
          aria-live="polite"
        >
          <div
            key={cartToastNonce}
            className={cn(
              'flex w-max max-w-[min(92vw,26rem)] items-start gap-3 rounded-2xl border border-emerald-500/35 bg-linear-to-br from-emerald-800 to-teal-900 px-4 py-3 text-white shadow-[0_12px_36px_-6px_rgba(6,78,59,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset] dark:from-emerald-700 dark:to-teal-800 dark:border-emerald-400/30 dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.5)]',
              cartToastExiting
                ? 'animate-[cart-toast-out_0.32s_ease-in_forwards]'
                : 'animate-[cart-toast-in_0.42s_cubic-bezier(0.22,1,0.36,1)_both]',
            )}
          >
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-emerald-200 drop-shadow-sm"
              aria-hidden
            />
            <p className="min-w-0 max-w-full text-left text-sm leading-snug text-emerald-50">
              <span className="text-emerald-100/85">Đã thêm </span>
              <span className="font-semibold wrap-break-word text-white">{cartToastName}</span>
              <span className="text-emerald-100/85"> vào giỏ hàng</span>
            </p>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b bg-background/95 px-3 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:gap-3 sm:px-4">
        <Link
          to="/"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Về trang chủ"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 text-lg font-semibold leading-tight tracking-tight">
          Quét &amp; thanh toán
        </h1>
        <ScannerModeMenu value={scannerMode} onChange={setScannerMode} />
      </header>

      <div className="flex flex-1 flex-col overflow-auto pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        <div className="grid flex-1 gap-2 px-0 md:grid-cols-[1fr_420px] md:items-start md:gap-3 md:px-0">
      <div className="flex min-w-0 flex-col gap-2">
        {scannerMode === 'html5' ? (
          <Scanner embedded onScan={handleScan} settings={scannerSettings} />
        ) : scannerMode === 'python' ? (
          <PyBarcodeScanner embedded onScan={handleScan} settings={scannerSettings} />
        ) : (
          <React.Suspense
            fallback={
              <div className="rounded-2xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground shadow-xs">
                Đang tải Scanbot…
              </div>
            }
          >
            <ScanbotBarcodeScanner
              embedded
              onScan={handleScan}
              onInitFailed={onScanbotInitFailed}
              settings={scannerSettings}
            />
          </React.Suspense>
        )}
      </div>

      <CartScanList
        products={scannedProducts}
        draftPrices={draftPrices}
        onDraftPriceChange={onDraftPriceChange}
        onClear={() => {
          setScannedProducts([])
          setDraftPrices({})
        }}
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
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-md supports-backdrop-filter:bg-card/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <span className="text-sm font-medium text-muted-foreground">Tổng thanh toán</span>
          <span className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
            {formatVnd(cartTotal)}
          </span>
        </div>
        <div
          className="h-[env(safe-area-inset-bottom)] min-h-[env(safe-area-inset-bottom)] bg-card/95"
          aria-hidden
        />
      </footer>

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
