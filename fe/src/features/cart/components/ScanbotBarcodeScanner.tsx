import {
  DEFAULT_SCANNER_SETTINGS,
  scanbotBarcodeFormatConfigurationsFromIds,
  type ScannerSettings,
} from '@/features/cart/scanner-config'
import { stopAllVideoElementStreams } from '@/lib/camera-stream'
import { playBeep, unlockAudio } from '@/lib/sound-beep'
import { scanbotEnginePath } from '@/lib/scanbot-engine'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ScanbotSDK from 'scanbot-web-sdk/ui'
import type { BarcodeScannerResultWithSize } from 'scanbot-web-sdk/@types/model/barcode/barcode-result'
import type { BarcodeScannerViewConfiguration } from 'scanbot-web-sdk/@types/model/configuration/barcode-scanner-view-configuration'
import type { IBarcodeScannerHandle } from 'scanbot-web-sdk/@types/interfaces/i-barcode-scanner-handle'

function licenseKeyFromEnv(): string {
  const k = import.meta.env.VITE_SCANBOT_LICENSE_KEY
  return typeof k === 'string' ? k : ''
}

function formatScanbotError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  if (/license/i.test(msg)) {
    return [
      msg,
      '',
      'License trial thường gắn với domain/host đã đăng ký.',
      `Host hiện tại: ${origin}`,
      'https://docs.scanbot.io/trial/',
    ].join('\n')
  }
  return msg
}

export default function ScanbotBarcodeScanner({
  onScan,
  onInitFailed,
  settings = DEFAULT_SCANNER_SETTINGS,
}: {
  onScan: (item: string) => void
  /** Gọi khi SDK/container không khởi tạo được — parent có thể chuyển sang scanner HTML5. */
  onInitFailed?: () => void
  settings?: ScannerSettings
}) {
  const reactId = useId().replace(/:/g, '')
  const containerId = `scanbot-barcode-${reactId}`

  const [status, setStatus] = useState<'idle' | 'initializing' | 'running' | 'error'>('idle')
  const [hint, setHint] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  const handleRef = useRef<IBarcodeScannerHandle | null>(null)
  const lastCodeAtRef = useRef<{ text: string; at: number }>({ text: '', at: 0 })
  const scanGenRef = useRef(0)
  const onScanRef = useRef(onScan)
  const gateOpenRef = useRef(true)
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Scanbot hay gọi onError liên tục (cùng lỗi); chỉ log 1 lần / gom bản sao. */
  const scanbotErrDedupeRef = useRef<{ msg: string; dup: number }>({
    msg: '',
    dup: 0,
  })
  const onInitFailedRef = useRef(onInitFailed)
  const reportedInitFailureRef = useRef(false)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    onInitFailedRef.current = onInitFailed
  }, [onInitFailed])

  const reportInitFailed = useCallback(() => {
    if (reportedInitFailureRef.current) return
    reportedInitFailureRef.current = true
    onInitFailedRef.current?.()
  }, [])

  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('scanner-full')
    return () => root?.classList.remove('scanner-full')
  }, [])

  const toggleTorch = useCallback(() => {
    const h = handleRef.current
    if (!h) return
    const next = !torchOn
    void h.setTorchState(next).then(() => setTorchOn(next))
  }, [torchOn])

  useEffect(() => {
    const myGen = ++scanGenRef.current
    let cancelled = false
    const dedupe = scanbotErrDedupeRef.current

    const run = async () => {
      const scanCooldownMs = settings.scanCooldownMs
      const sameBarcodeCooldownMs = settings.sameBarcodeCooldownMs

      setHint(null)
      setStatus('initializing')

      if (!document.getElementById(containerId)) {
        if (myGen === scanGenRef.current) {
          setStatus('error')
          setHint('Không tìm thấy container camera.')
          reportInitFailed()
        }
        return
      }

      try {
        const sdk = await ScanbotSDK.initialize({
          licenseKey: licenseKeyFromEnv(),
          enginePath: scanbotEnginePath(),
          verboseLogging: false,
        })
        if (cancelled || myGen !== scanGenRef.current) return

        const viewConfig = {
          containerId,
          previewMode: 'FILL_IN' as const,
          backgroundColor: '#0a0a0a',
          userGuidance: { visible: false },
          finder: {
            _type: 'ViewFinderConfiguration' as const,
            visible: true,
            aspectRatio: { width: 16, height: 9 },
          },
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 30 },
          },
          captureDelay: 750,
          scannerConfiguration: {
            engineMode: 'NEXT_GEN' as const,
            barcodeFormatConfigurations:
              scanbotBarcodeFormatConfigurationsFromIds(settings.barcodeFormats),
          },
          onBarcodesDetected: (e: BarcodeScannerResultWithSize) => {
            if (e.isEmpty() || !e.barcodes.length) return
            if (!gateOpenRef.current) return

            const bar = e.barcodes[0]
            const text = bar.text
            const now = Date.now()
            const { text: prev, at } = lastCodeAtRef.current
            if (text === prev && now - at < sameBarcodeCooldownMs) return
            lastCodeAtRef.current = { text, at: now }

            gateOpenRef.current = false
            if (cooldownTimerRef.current) {
              clearTimeout(cooldownTimerRef.current)
              cooldownTimerRef.current = null
            }

            onScanRef.current(text)
            playBeep()
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(25)
            }

            cooldownTimerRef.current = setTimeout(() => {
              cooldownTimerRef.current = null
              gateOpenRef.current = true
            }, scanCooldownMs)
          },
          onError: (err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err)
            const r = scanbotErrDedupeRef.current
            if (r.msg === msg) {
              r.dup += 1
              return
            }
            if (r.msg && r.dup > 0 && import.meta.env.DEV) {
              console.warn(
                `[Scanbot] Lỗi trước lặp ${r.dup} lần (đã ẩn log để tránh spam).`,
              )
            }
            r.msg = msg
            r.dup = 0
            if (import.meta.env.DEV) {
              console.warn('[Scanbot]', err)
            }
          },
        } as unknown as BarcodeScannerViewConfiguration

        const handle = await sdk.createBarcodeScanner(viewConfig)
        if (cancelled || myGen !== scanGenRef.current) {
          handle.dispose()
          return
        }

        handleRef.current = handle
        setStatus('running')
        try {
          const caps = handle.getCapabilities?.() as MediaTrackCapabilities & {
            torch?: boolean
          }
          setTorchSupported(Boolean(caps?.torch))
        } catch {
          setTorchSupported(false)
        }
        setTorchOn(false)
      } catch (e) {
        if (myGen === scanGenRef.current) {
          setStatus('error')
          setHint(formatScanbotError(e))
          reportInitFailed()
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      if (dedupe.dup > 0 && import.meta.env.DEV) {
        console.warn(
          `[Scanbot] Lỗi “${dedupe.msg.slice(0, 120)}${dedupe.msg.length > 120 ? '…' : ''}” lặp thêm ${dedupe.dup} lần trước khi đóng scanner.`,
        )
      }
      dedupe.msg = ''
      dedupe.dup = 0
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
      gateOpenRef.current = true
      try {
        handleRef.current?.dispose()
      } catch {
        /* ignore */
      }
      handleRef.current = null
      lastCodeAtRef.current = { text: '', at: 0 }
      const host = document.getElementById(containerId)
      if (host) stopAllVideoElementStreams(host)
    }
  }, [containerId, reportInitFailed, settings])

  const showError = status === 'error' && hint
  const showLoading = status === 'initializing'

  return (
    <div className="bg-background pb-[calc(env(safe-area-inset-bottom)+12px)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] text-foreground">
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
          Scanbot · NEXT_GEN · khung 16:9 · quét liên tục
        </p>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => {
              void unlockAudio().then(() => playBeep())
            }}
            className="rounded-lg border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Bật âm / Test beep
          </button>
        </div>
        {!licenseKeyFromEnv() && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
            Cần biến môi trường{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.75rem]">VITE_SCANBOT_LICENSE_KEY</code>
            .{' '}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href="https://docs.scanbot.io/trial/"
              target="_blank"
              rel="noreferrer"
            >
              Tài liệu trial
            </a>
          </p>
        )}
      </header>

      <div className="relative mx-3 mt-1 shrink-0 overflow-hidden rounded-2xl border bg-card shadow-xs sm:mx-auto sm:max-w-2xl">
        <div className="aspect-video w-full min-h-0">
          {showLoading && !showError && (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-5 text-center text-[15px] text-muted-foreground backdrop-blur"
              aria-live="polite"
            >
              Đang tải engine &amp; camera…
            </div>
          )}
          {showError && (
            <div
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-destructive/10 p-5 text-center text-[15px] leading-relaxed text-destructive whitespace-pre-wrap"
              role="alert"
            >
              {hint}
            </div>
          )}
          <div
            id={containerId}
            className="size-full min-h-0 [&_video]:h-full! [&_video]:w-full! [&_video]:rounded-xl"
          />
        </div>
        {status === 'running' && torchSupported && !showError && (
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
    </div>
  )
}
