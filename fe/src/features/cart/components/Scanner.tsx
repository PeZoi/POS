import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const READER_ID = 'qr-reader'

/** html5-qrcode yêu cầu mỗi chiều qrbox ≥ 50px. */
const MIN_BOX = 50

/** Decode nhanh (mặc định) — FPS cao hơn, ít định dạng hơn để nhẹ CPU. */
const SCAN_FPS_FAST = 22

/** Sau mỗi lần đọc mã thành công: chờ trước khi cho quét tiếp (tránh trùng lặp). */
const COOLDOWN_MS = 1000

let scanSuccessAudioCtx: AudioContext | null = null

function playScanSuccessTing(): void {
  if (typeof window === 'undefined') return
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return
    if (!scanSuccessAudioCtx || scanSuccessAudioCtx.state === 'closed') {
      scanSuccessAudioCtx = new AC()
    }
    const ctx = scanSuccessAudioCtx
    void ctx.resume()
    const t0 = ctx.currentTime

    const playBeep = (freq: number, start: number, durationSec: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + durationSec + 0.03)
    }

    playBeep(1500, t0 + 0.0, 0.055)
    playBeep(2000, t0 + 0.085, 0.065)
  } catch {
    /* ignore */
  }
}

/** Độ phân giải ưu tiên: barcode rõ nét hơn (camera sẽ tự giảm nếu không hỗ trợ). */
const VIDEO_IDEAL = {
  width: { min: 1280, ideal: 1920 },
  height: { min: 720, ideal: 1080 },
  frameRate: { ideal: 30, max: 30 },
} as const

function buildPremiumVideoConstraints(): MediaTrackConstraints {
  const advanced = [
    { focusMode: 'continuous' },
    { exposureMode: 'continuous' },
    { whiteBalanceMode: 'continuous' },
  ] as unknown as MediaTrackConstraintSet[]
  return {
    facingMode: 'environment',
    ...VIDEO_IDEAL,
    advanced,
  }
}

async function enableAutoFocus(scanner: Html5Qrcode): Promise<void> {
  try {
    await scanner.applyVideoConstraints({
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'continuous' },
        { whiteBalanceMode: 'continuous' },
      ],
    } as unknown as MediaTrackConstraints)
  } catch {
    /* ignore */
  }
}

async function enableAutoZoom(scanner: Html5Qrcode): Promise<void> {
  try {
    const anyScanner = scanner as unknown as {
      getRunningTrack?: () => MediaStreamTrack | undefined
    }
    let track =
      typeof anyScanner.getRunningTrack === 'function'
        ? anyScanner.getRunningTrack()
        : undefined
    if (!track) {
      const video = document.querySelector(
        `#${READER_ID} video`,
      ) as HTMLVideoElement | null
      const stream = video?.srcObject as MediaStream | null
      track = stream?.getVideoTracks()[0]
    }
    if (!track) return

    const caps = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min?: number; max?: number }
    }
    const zoom = caps.zoom
    if (zoom == null || typeof zoom !== 'object' || typeof zoom.max !== 'number') return

    await track.applyConstraints({
      advanced: [{ zoom: Math.min(zoom.max, 2.0) }],
    } as unknown as MediaTrackConstraints)
  } catch {
    /* ignore */
  }
}

/** Chỉ barcode POS phổ biến — decoder nhẹ nhất. */
const BARCODE_ONLY: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
]

function qrboxHorizontal(
  viewfinderWidth: number,
  viewfinderHeight: number,
): { width: number; height: number } {
  const w = viewfinderWidth
  const h = viewfinderHeight
  const boxW = Math.max(MIN_BOX, Math.floor(w * 0.88))
  const boxH = Math.max(MIN_BOX, Math.floor(Math.min(h * 0.45, boxW / 2.4)))
  return {
    width: Math.min(boxW, w),
    height: Math.min(boxH, h),
  }
}



export default function Scanner({ onScan }: { onScan: (item: string) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])
  const effectiveFps = SCAN_FPS_FAST

  useEffect(() => {
    // Load scanner styles only when this screen is used.
    void import('./Scanner.css')
  }, [])

  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('scanner-full')

    let cancelled = false
    const scanner = new Html5Qrcode(READER_ID, {
      verbose: false,
      formatsToSupport: BARCODE_ONLY,
      useBarCodeDetectorIfSupported: true,
    })
    scannerRef.current = scanner

    let gateOpen = true
    let cooldownTimer: ReturnType<typeof setTimeout> | null = null

    const safeShutdown = () => {
      if (cooldownTimer !== null) {
        clearTimeout(cooldownTimer)
        cooldownTimer = null
      }
      gateOpen = true
      try {
        if (scanner.isScanning) {
          scanner
            .stop()
            .then(() => {
              try {
                scanner.clear()
              } catch {
                /* ignore */
              }
            })
            .catch(() => {})
        } else {
          try {
            scanner.clear()
          } catch {
            /* ignore */
          }
        }
      } catch {
        try {
          scanner.clear()
        } catch {
          /* ignore */
        }
      }
    }

    const run = async () => {
      setError(null)
      setStarting(true)
      setTorchSupported(false)
      setTorchOn(false)

      const baseConfig = {
        fps: effectiveFps,
        qrbox: qrboxHorizontal,
      } as const

      const tryStart = async (usePremiumConstraints: boolean) => {
        await scanner.start(
          { facingMode: 'environment' },
          usePremiumConstraints
            ? { ...baseConfig, videoConstraints: buildPremiumVideoConstraints() }
            : baseConfig,
          (decodedText) => {
            if (cancelled || !gateOpen) return
            gateOpen = false
            onScanRef.current(decodedText)
            playScanSuccessTing()
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(25)
            }
            try {
              scanner.pause(false)
            } catch {
              gateOpen = true
              return
            }
            cooldownTimer = setTimeout(() => {
              cooldownTimer = null
              if (cancelled) {
                gateOpen = true
                return
              }
              try {
                scanner.resume()
              } catch {
                /* ignore */
              }
              gateOpen = true
            }, COOLDOWN_MS)
          },
          () => {},
        )
        await enableAutoFocus(scanner)
        await enableAutoZoom(scanner)
      }

      try {
        try {
          await tryStart(true)
        } catch (first) {
          if (cancelled) return
          const retry =
            first instanceof DOMException &&
            (first.name === 'OverconstrainedError' ||
              first.name === 'ConstraintNotSatisfiedError')
          if (retry) {
            await tryStart(false)
          } else {
            throw first
          }
        }
        if (cancelled) {
          safeShutdown()
          return
        }
        try {
          const caps = scanner.getRunningTrackCameraCapabilities()
          setTorchSupported(caps.torchFeature().isSupported())
          setTorchOn(false)
        } catch {
          setTorchSupported(false)
        }
      } catch (e) {
        if (cancelled) {
          safeShutdown()
          return
        }
        const msg =
          e instanceof Error ? e.message : 'Không thể mở camera.'
        setError(
          `${msg} — Thử cấp quyền camera hoặc dùng HTTPS / localhost.`,
        )
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    run()

    return () => {
      cancelled = true
      root?.classList.remove('scanner-full')
      setTorchSupported(false)
      setTorchOn(false)
      scannerRef.current = null
      safeShutdown()
    }
  }, [effectiveFps])

  const toggleTorch = useCallback(() => {
    const scanner = scannerRef.current
    if (!scanner?.isScanning) return
    try {
      const torch = scanner.getRunningTrackCameraCapabilities().torchFeature()
      if (!torch.isSupported()) return
      const next = !torchOn
      void torch.apply(next).then(() => setTorchOn(next))
    } catch {
      /* ignore */
    }
  }, [torchOn])

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
          Decode nhanh · {effectiveFps} FPS · EAN/UPC/Code128
        </p>
      </header>

      <div
        className="relative mx-3 mt-1 shrink-0 overflow-hidden rounded-2xl border bg-card shadow-xs sm:mx-auto sm:max-w-2xl"
      >
        <div
          className="w-full min-h-0 aspect-video"
        >
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
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-destructive/10 p-5 text-center text-[15px] leading-relaxed text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}
          <div
            id={READER_ID}
            className="size-full min-h-0 [&_video]:h-full! [&_video]:w-full! [&_video]:rounded-xl"
          />
        </div>
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
    </div>
  )
}
