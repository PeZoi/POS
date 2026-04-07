import * as React from 'react'

import { Button } from '@/components/ui/button'
import { useCartStore } from '@/features/cart/cart-store'
import { cartGrandTotal, cartLinesFromProducts } from '@/features/cart/cart-lines'
import { EmbeddedBarcodeScannerSection } from '@/features/cart/components/EmbeddedBarcodeScannerSection'
import { useScannerSettings } from '@/features/cart/scanner-config'
import { CartProductSearch } from '@/features/cart/components/CartProductSearch'
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
import { Link, useNavigate } from 'react-router-dom'

export default function CartPayment() {
  const navigate = useNavigate()
  const scannerSettings = useScannerSettings()

  const scannedProducts = useCartStore((s) => s.products)
  const draftPrices = useCartStore((s) => s.draftPrices)
  const setProducts = useCartStore((s) => s.setProducts)
  const clearCart = useCartStore((s) => s.clear)
  const setDraftPrice = useCartStore((s) => s.setDraftPrice)
  const [scanningLocked, setScanningLocked] = React.useState(false)
  const [updatingProductId, setUpdatingProductId] = React.useState<number | null>(null)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [pendingBarcode, setPendingBarcode] = React.useState<string | null>(null)
  const [scanError, setScanError] = React.useState<string | null>(null)
  const [scannerMode, setScannerMode] = React.useState<ScannerModeId>('scanbot')
  const [cartToastMessage, setCartToastMessage] = React.useState<string | null>(null)
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
      setCartToastMessage(`Đã thêm ${productName} vào giỏ hàng`)
      cartToastHideTimerRef.current = setTimeout(() => {
        setCartToastExiting(true)
        cartToastRemoveTimerRef.current = setTimeout(() => {
          setCartToastMessage(null)
          setCartToastExiting(false)
          cartToastRemoveTimerRef.current = null
        }, 320)
        cartToastHideTimerRef.current = null
      }, 1000)
    },
    [clearCartToastTimers],
  )

  const showPriceUpdatedToast = React.useCallback(
    (productName: string, priceText: string) => {
      clearCartToastTimers()
      setCartToastExiting(false)
      setCartToastNonce((n) => n + 1)
      setCartToastMessage(`Đã cập nhật giá ${productName} → ${priceText}`)
      cartToastHideTimerRef.current = setTimeout(() => {
        setCartToastExiting(true)
        cartToastRemoveTimerRef.current = setTimeout(() => {
          setCartToastMessage(null)
          setCartToastExiting(false)
          cartToastRemoveTimerRef.current = null
        }, 320)
        cartToastHideTimerRef.current = null
      }, 1200)
    },
    [clearCartToastTimers],
  )

  React.useEffect(() => {
    return () => {
      clearCartToastTimers()
    }
  }, [clearCartToastTimers])

  // iOS Safari/back-forward cache: đảm bảo dừng camera khi rời trang (tránh crash/reload ngẫu nhiên).
  React.useEffect(() => {
    const stop = () => stopAllVideoStreamsUnderRoot()

    const onPageHide = () => stop()
    const onFreeze = () => stop()
    const onVisibility = () => {
      // iOS Safari hay crash/reload khi WebRTC stream còn sống trong back/forward cache
      if (document.visibilityState !== 'visible') stop()
    }
    const onPageShow = (e: PageTransitionEvent) => {
      // Nếu trang được restore từ BFCache, đảm bảo không còn stream cũ.
      if (e.persisted) stop()
    }

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('freeze', onFreeze as EventListener)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow as EventListener)

    return () => {
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('freeze', onFreeze as EventListener)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow as EventListener)
    }
  }, [])

  // Giỏ hàng được persist: không tự clear khi vào trang.

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
  const cartLineCount = React.useMemo(
    () => cartLinesFromProducts(scannedProducts).length,
    [scannedProducts],
  )

  const onDraftPriceChange = React.useCallback((productId: number, raw: string) => {
    setDraftPrice(productId, raw)
  }, [setDraftPrice])

  const finishScanProcessing = React.useCallback(() => {
    scanProcessingResolveRef.current?.()
    scanProcessingResolveRef.current = null
  }, [])

  const openCreatePopup = React.useCallback((barcode: string | null, initialError?: string) => {
    setPendingBarcode(barcode)
    setScanError(initialError ?? null)
    setCreateOpen(true)
    setScanningLocked(true)

    return new Promise<void>((resolve) => {
      scanProcessingResolveRef.current = resolve
    })
  }, [])

  const addProductToCart = React.useCallback(
    (product: Product) => {
      setProducts((prev: Product[]) => {
        const already = prev.some((p) => p.id === product.id)
        if (already) return [...prev, { ...product }]
        return [product, ...prev]
      })
      showAddedToCartToast(product.name)
    },
    [setProducts, showAddedToCartToast],
  )

  const onCreateProduct = React.useCallback(
    async (payload: CreateProductInput) => {
      const created = await productService.create(payload)
      addProductToCart(created)
    },
    [addProductToCart],
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
        addProductToCart(existing)

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
    [addProductToCart, openCreatePopup, scanningLocked],
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {cartToastMessage && (
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
              <span className="font-semibold wrap-break-word text-white">{cartToastMessage}</span>
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
        <CartProductSearch
          onPickProduct={addProductToCart}
          onQuickAdd={() => void openCreatePopup(null)}
          formatVnd={formatVnd}
        />
        <EmbeddedBarcodeScannerSection
          layout="panel"
          onScan={handleScan}
          settings={scannerSettings}
          scannerMode={scannerMode}
          onScannerModeChange={setScannerMode}
        />
      </div>

      <CartScanList
        products={scannedProducts}
        draftPrices={draftPrices}
        onDraftPriceChange={onDraftPriceChange}
        onClear={() => {
          clearCart()
        }}
        onDec={(productId) =>
          setProducts((prev: Product[]) => {
            const idx = prev.findIndex((p: Product) => p.id === productId)
            if (idx < 0) return prev
            return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
          })
        }
        onInc={(productId) =>
          setProducts((prev: Product[]) => {
            const found = prev.find((p: Product) => p.id === productId)
            if (!found) return prev
            // Append to keep existing group order stable.
            return [...prev, { ...found }]
          })
        }
        onRemoveLine={(productId) =>
          setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== productId))
        }
        updatingProductId={updatingProductId}
        onUpdateUnitPrice={async (productId, price) => {
          if (updatingProductId !== null) return
          const current = scannedProducts.find((p) => p.id === productId)
          if (!current) return

          setUpdatingProductId(productId)
          try {
            await productService.update(productId, {
              name: current.name,
              barcode: current.barcode,
              price,
              status: current.status,
              isAutoCreated: current.isAutoCreated,
            })

            setProducts((prev: Product[]) =>
              prev.map((p: Product) => (p.id === productId ? { ...p, price } : p)),
            )
            setDraftPrice(productId, String(price))
            showPriceUpdatedToast(current.name, formatVnd(price))
          } catch (e) {
            const message =
              e instanceof ApiError || e instanceof Error
                ? e.message
                : 'Không thể cập nhật giá.'
            globalThis.alert?.(message)
          } finally {
            setUpdatingProductId(null)
          }
        }}
        formatVnd={formatVnd}
      />
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] backdrop-blur-md supports-backdrop-filter:bg-card/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <span className="text-sm font-medium text-muted-foreground">Tổng thanh toán</span>
            <div className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
              {formatVnd(cartTotal)}
            </div>
          </div>
          <Button
            size="lg"
            disabled={scannedProducts.length === 0}
            onClick={() => {
              navigate('/cart/preview')
            }}
          >
            Thanh toán ({cartLineCount})
          </Button>
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
