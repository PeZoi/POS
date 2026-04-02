import * as React from 'react'

import Scanner from '@/features/cart/components/Scanner'
import { CartScanList } from '@/features/cart/components/CartScanList'
import { QuickCreateProductModal } from '@/features/cart/components/QuickCreateProductModal'
import type { CreateProductInput, Product } from '@/types/pos'
import { productService } from '@/services/productService'
import { ApiError } from '@/services/apiClient'

export default function CartPayment() {
  const [scannedProducts, setScannedProducts] = React.useState<Product[]>([])
  const [scanningLocked, setScanningLocked] = React.useState(false)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [pendingBarcode, setPendingBarcode] = React.useState<string | null>(null)
  const [scanError, setScanError] = React.useState<string | null>(null)

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
      <Scanner onScan={handleScan} />

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
