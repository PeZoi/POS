import type { ScannerSettings } from '@/features/cart/scanner-config'
import {
  PY_BARCODE,
  applyContinuousFocus,
  cropNormPolyToFullVideo,
  cropNormRectToFullVideo,
  getUserMediaWithVideoFallback,
  jpegOutputSizeForCrop,
  mapNormPolyToContainer,
  mapNormRectToContainer,
  pyBarcodeWsUrl,
  pyDecodeFormatAllowed,
  visibleVideoCropPixels,
} from '@/lib/py-barcode-scanner'
import { playBeep } from '@/lib/sound-beep'
import type {
  PyBarcodeDetectPayload,
  PyBarcodeFrameCropMeta,
  PyBarcodeOverlayState,
} from '@/types/py-barcode-scanner.type'
import { passesStrictGtinChecksum } from '@/utils/barcodeChecksum'
import { useCallback, useEffect, useRef, useState } from 'react'

const WS_ERROR_HINT =
  'WebSocket lỗi — chạy `python server.py` trong thư mục `scanner-py` (cổng 8765, hoặc đặt PY_BARCODE_PORT).'

export function usePyBarcodeScanner(
  onScan: (code: string) => void,
  settings: ScannerSettings,
) {
  const [error, setError] = useState<string | null>(null)
  const [wsHint, setWsHint] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const captureRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const frameIdRef = useRef(0)
  const inFlightRef = useRef(false)
  const scanCooldownUntilRef = useRef(0)
  const frameMetaByIdRef = useRef<Map<number, PyBarcodeFrameCropMeta>>(new Map())
  const frameMetaOrderRef = useRef<number[]>([])
  const stableDecodeRef = useRef<{ text: string; count: number } | null>(null)
  const overlayStateRef = useRef<PyBarcodeOverlayState | null>(null)
  const rafRef = useRef(0)
  const genRef = useRef(0)
  const onScanRef = useRef(onScan)
  const settingsRef = useRef(settings)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const resizeOverlay = useCallback(() => {
    const canvas = overlayRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const r = wrap.getBoundingClientRect()
    const w = Math.max(1, Math.floor(r.width))
    const h = Math.max(1, Math.floor(r.height))
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  const drawOverlayLoop = useCallback(() => {
    const canvas = overlayRef.current
    const video = videoRef.current
    if (!canvas || !video) {
      rafRef.current = requestAnimationFrame(drawOverlayLoop)
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      rafRef.current = requestAnimationFrame(drawOverlayLoop)
      return
    }
    const w = canvas.width / (window.devicePixelRatio || 1)
    const h = canvas.height / (window.devicePixelRatio || 1)
    ctx.clearRect(0, 0, w, h)
    const st = overlayStateRef.current
    const now = Date.now()
    const vw = video.videoWidth
    const vh = video.videoHeight
    if (st && now < st.until && vw > 0 && vh > 0 && (st.polygon?.length || st.rect)) {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.95)'
      ctx.lineWidth = 3
      ctx.shadowColor = 'rgba(22, 163, 74, 0.45)'
      ctx.shadowBlur = 12
      if (st.polygon && st.polygon.length >= 3) {
        const pts = mapNormPolyToContainer(w, h, vw, vh, st.polygon)
        ctx.beginPath()
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
        ctx.closePath()
        ctx.stroke()
      } else if (st.rect) {
        const r = mapNormRectToContainer(w, h, vw, vh, st.rect)
        ctx.strokeRect(r.x, r.y, r.w, r.h)
      }
      ctx.shadowBlur = 0
    }
    rafRef.current = requestAnimationFrame(drawOverlayLoop)
  }, [])

  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('scanner-full')
    const myGen = ++genRef.current
    const videoEl = videoRef.current
    resizeOverlay()
    const ro = new ResizeObserver(() => resizeOverlay())
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    wrapRef.current && ro.observe(wrapRef.current)
    rafRef.current = requestAnimationFrame(drawOverlayLoop)

    void (async () => {
      setError(null)
      setStarting(true)
      const video = videoEl ?? videoRef.current
      if (!video) {
        if (myGen === genRef.current) setStarting(false)
        return
      }
      try {
        const stream = await getUserMediaWithVideoFallback()
        if (myGen !== genRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        video.srcObject = stream
        await video.play()
        const [track] = stream.getVideoTracks()
        if (track) void applyContinuousFocus(track)
        const caps =
          typeof track?.getCapabilities === 'function' ? track.getCapabilities() : {}
        setTorchSupported(
          typeof caps === 'object' &&
            caps !== null &&
            'torch' in caps &&
            (caps as { torch?: boolean }).torch === true,
        )
        setTorchOn(false)
      } catch (e) {
        if (myGen === genRef.current) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(`${msg} — Cần HTTPS hoặc localhost và quyền camera.`)
        }
      } finally {
        if (myGen === genRef.current) setStarting(false)
      }
    })()

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      genRef.current++
      root?.classList.remove('scanner-full')
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoEl) videoEl.srcObject = null
    }
  }, [drawOverlayLoop, resizeOverlay])

  useEffect(() => {
    let alive = true
    const url = pyBarcodeWsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws
    setWsHint(`Đang kết nối ${url}…`)

    ws.onopen = () => {
      if (alive) setWsHint('Đã kết nối server Python (OpenCV + WebSocket).')
    }
    ws.onerror = () => {
      if (!alive) return
      setWsHint(null)
      setError((prev) => prev ?? WS_ERROR_HINT)
    }
    ws.onclose = () => {
      if (alive) setWsHint(null)
    }

    ws.onmessage = (ev) => {
      inFlightRef.current = false
      let data: unknown
      try {
        data = JSON.parse(String(ev.data)) as unknown
      } catch {
        return
      }
      if (!data || typeof data !== 'object') return
      const o = data as Record<string, unknown>
      if (o.type === 'error' && typeof o.message === 'string') {
        setWsHint(`Lỗi server: ${o.message}`)
        return
      }
      if (o.type !== 'detect') return
      const d = o as unknown as PyBarcodeDetectPayload
      const video = videoRef.current
      if (!d.found || !d.text || !video || video.videoWidth < 2) return

      const now = Date.now()
      if (now < scanCooldownUntilRef.current) return

      const rawText = d.text.trim()
      if (!rawText) return

      const s = settingsRef.current
      if (!pyDecodeFormatAllowed(d.format, s.barcodeFormats)) {
        stableDecodeRef.current = null
        overlayStateRef.current = null
        return
      }

      if (
        import.meta.env.VITE_BARCODE_STRICT_GTIN === 'true' &&
        !passesStrictGtinChecksum(rawText)
      ) {
        stableDecodeRef.current = null
        overlayStateRef.current = null
        return
      }

      const fid =
        typeof d.frameId === 'number' && Number.isFinite(d.frameId) ? d.frameId : null
      const meta = fid != null ? frameMetaByIdRef.current.get(fid) : undefined
      if (!meta) return

      const { sx, sy, sw, sh, vw, vh } = meta
      const rectFull =
        d.rect != null ? cropNormRectToFullVideo(d.rect, sx, sy, sw, sh, vw, vh) : null
      const polyFull =
        d.polygon != null && d.polygon.length > 0
          ? cropNormPolyToFullVideo(d.polygon, sx, sy, sw, sh, vw, vh)
          : null

      let st = stableDecodeRef.current
      st =
        !st || st.text !== rawText
          ? { text: rawText, count: 1 }
          : { text: rawText, count: st.count + 1 }
      stableDecodeRef.current = st

      overlayStateRef.current = {
        rect: rectFull,
        polygon: polyFull,
        vw,
        vh,
        until: now + PY_BARCODE.OVERLAY_HOLD_MS,
      }

      if (st.count < PY_BARCODE.STABLE_STREAK) return

      stableDecodeRef.current = null
      scanCooldownUntilRef.current = now + s.scanCooldownMs
      onScanRef.current(rawText)
      playBeep()
      navigator.vibrate?.(25)
    }

    return () => {
      alive = false
      ws.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    const { CAPTURE_INTERVAL_MS, MAX_CAPTURE_SIDE, JPEG_QUALITY, FRAME_META_MAX } =
      PY_BARCODE
    const tick = () => {
      const ws = wsRef.current
      const video = videoRef.current
      const cap = captureRef.current
      const wrap = wrapRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN || !video || !cap || !wrap) return
      if (video.readyState < 2 || video.videoWidth < 2) return
      if (inFlightRef.current || Date.now() < scanCooldownUntilRef.current) return

      const vw = video.videoWidth
      const vh = video.videoHeight
      const cr = wrap.getBoundingClientRect()
      if (cr.width < 2 || cr.height < 2) return
      const { sx, sy, sw, sh } = visibleVideoCropPixels(vw, vh, cr.width, cr.height)
      const { tw, th } = jpegOutputSizeForCrop(sw, sh, MAX_CAPTURE_SIDE)

      cap.width = tw
      cap.height = th
      const c = cap.getContext('2d')
      if (!c) return
      c.drawImage(video, sx, sy, sw, sh, 0, 0, tw, th)
      const b64 = cap.toDataURL('image/jpeg', JPEG_QUALITY).replace(/^data:image\/jpeg;base64,/, '')
      const frameId = ++frameIdRef.current

      const metaMap = frameMetaByIdRef.current
      const order = frameMetaOrderRef.current
      metaMap.set(frameId, { sx, sy, sw, sh, vw, vh })
      order.push(frameId)
      while (order.length > FRAME_META_MAX) {
        const old = order.shift()
        if (old != null) metaMap.delete(old)
      }

      inFlightRef.current = true
      ws.send(JSON.stringify({ type: 'frame', frameId, jpeg: b64 }))
    }
    const id = window.setInterval(tick, CAPTURE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])

  const toggleTorch = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    void track
      .applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints)
      .then(() => setTorchOn(next))
      .catch(() => {})
  }, [torchOn])

  return {
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
  }
}
