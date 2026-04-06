import { DEFAULT_SCANNER_SETTINGS, type ScannerSettings } from '@/features/cart/scanner-config'
import { usePyBarcodeScanner } from '@/features/cart/hooks/usePyBarcodeScanner'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import * as React from 'react'

export default function PyBarcodeScanner({
  onScan,
  settings = DEFAULT_SCANNER_SETTINGS,
  embedded = false,
  onError,
}: {
  onScan: (item: string) => void
  settings?: ScannerSettings
  embedded?: boolean
  onError?: (message: string) => void
}) {
  const {
    videoRef,
    captureRef,
    overlayRef,
    wrapRef,
    error,
    wsHint,
    starting,
    torchSupported,
    torchOn,
    toggleTorch,
  } = usePyBarcodeScanner(onScan, settings)

  // Bubble error lên parent để fallback mode.
  React.useEffect(() => {
    if (!error) return
    onError?.(error)
  }, [error, onError])

  return (
    <div
      className={cn(
        'text-foreground',
        !embedded &&
          'bg-background pb-[calc(env(safe-area-inset-bottom)+12px)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]',
      )}
    >
      {!embedded && (
        <header className="shrink-0 px-4 pb-2 pt-3 sm:px-6 sm:pt-6">
          <Link
            className="mb-2.5 inline-block rounded-lg px-2 py-1.5 text-[15px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            to="/"
          >
            ← Trang chủ
          </Link>
          <h1 className="mb-1.5 text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
            Quét mã vạch
          </h1>
          <p className="max-w-[56ch] text-sm leading-snug text-muted-foreground">
            Scanner Python · cần{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.75rem]">python server.py</code> trong{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.75rem]">scanner-py</code>
          </p>
          {wsHint && (
            <p className="mt-2 text-xs text-muted-foreground" role="status">
              {wsHint}
            </p>
          )}
          {import.meta.env.VITE_BARCODE_STRICT_GTIN === 'true' && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
              Đang bật <code className="rounded bg-muted px-1 py-0.5">VITE_BARCODE_STRICT_GTIN</code>.
            </p>
          )}
        </header>
      )}

      <div
        ref={wrapRef}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-2xl border bg-card shadow-xs sm:mx-auto sm:max-w-2xl',
          embedded ? 'mx-0 mt-0' : 'mx-3 mt-1',
        )}
      >
        <div className="aspect-video w-full min-h-0">
          {starting && !error && (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-5 text-center text-[15px] text-muted-foreground backdrop-blur"
              aria-live="polite"
            >
              Đang bật camera…
            </div>
          )}
          {error && (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-destructive/10 p-5 text-center text-[15px] leading-relaxed text-destructive whitespace-pre-wrap"
              role="alert"
            >
              {error}
            </div>
          )}
          <video
            ref={videoRef}
            className="size-full object-cover [&:fullscreen]:object-contain"
            muted
            playsInline
            autoPlay
          />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" aria-hidden />
        </div>
        <canvas ref={captureRef} className="hidden" aria-hidden />
        {torchSupported && !error && (
          <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2">
            <button
              type="button"
              onClick={toggleTorch}
              className="rounded-xl border bg-background/90 px-4 py-2 text-sm font-medium shadow-lg transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {torchOn ? 'Tắt đèn' : 'Bật đèn'}
            </button>
          </div>
        )}
      </div>
      {embedded && wsHint && (
        <p className="mt-1.5 px-0.5 text-[11px] leading-snug text-muted-foreground" role="status">
          {wsHint}
        </p>
      )}
    </div>
  )
}
