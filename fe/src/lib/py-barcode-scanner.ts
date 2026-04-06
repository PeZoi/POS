import type { ScannerBarcodeFormatId } from '@/features/cart/scanner-config'
import type {
  PyBarcodeNormPoint,
  PyBarcodeNormRect,
} from '@/types/py-barcode-scanner.type'

/** Hằng số pipeline Python scanner (client). */
export const PY_BARCODE = {
  STABLE_STREAK: 2,
  CAPTURE_INTERVAL_MS: 85,
  MAX_CAPTURE_SIDE: 1920,
  JPEG_QUALITY: 0.86,
  OVERLAY_HOLD_MS: 450,
  FRAME_META_MAX: 24,
} as const

const VIDEO_CHAIN: MediaStreamConstraints[] = [
  {
    audio: false,
    video: {
      facingMode: 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
    },
  },
  {
    audio: false,
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  },
  { audio: false, video: { facingMode: 'environment' } },
]

const PYZBAR_FORMAT_MAP: Record<string, ScannerBarcodeFormatId> = {
  EAN13: 'EAN_13',
  EAN_8: 'EAN_8',
  EAN8: 'EAN_8',
  CODE128: 'CODE_128',
  CODE_128: 'CODE_128',
  UPCA: 'UPC_A',
  UPC_A: 'UPC_A',
  UPCE: 'UPC_E',
  UPC_E: 'UPC_E',
  UPC_E0: 'UPC_E',
  UPC_E1: 'UPC_E',
}

export function pyBarcodeWsUrl(): string {
  const env = import.meta.env.VITE_PY_BARCODE_WS
  if (typeof env === 'string' && env.length > 0) return env
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/pybarcode`
}

export function pyDecodeFormatAllowed(
  format: string | undefined,
  allowed: ScannerBarcodeFormatId[],
): boolean {
  if (!format) return true
  const f = format.trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (f === 'OPENCV' || f === 'UNKNOWN') return true
  const id = PYZBAR_FORMAT_MAP[f]
  if (!id) return true
  return allowed.includes(id)
}

/** object-cover: cùng transform cho rect / polygon. */
function objectCoverTransform(
  cw: number,
  ch: number,
  vw: number,
  vh: number,
): { dw: number; dh: number; ox: number; oy: number } {
  const scale = Math.max(cw / vw, ch / vh)
  const dw = vw * scale
  const dh = vh * scale
  return { dw, dh, ox: (cw - dw) / 2, oy: (ch - dh) / 2 }
}

export function mapNormRectToContainer(
  cw: number,
  ch: number,
  vw: number,
  vh: number,
  rect: PyBarcodeNormRect,
): { x: number; y: number; w: number; h: number } {
  const { dw, dh, ox, oy } = objectCoverTransform(cw, ch, vw, vh)
  return {
    x: ox + rect.x * dw,
    y: oy + rect.y * dh,
    w: rect.w * dw,
    h: rect.h * dh,
  }
}

export function mapNormPolyToContainer(
  cw: number,
  ch: number,
  vw: number,
  vh: number,
  poly: PyBarcodeNormPoint[],
): PyBarcodeNormPoint[] {
  const { dw, dh, ox, oy } = objectCoverTransform(cw, ch, vw, vh)
  return poly.map((p) => ({ x: ox + p.x * dw, y: oy + p.y * dh }))
}

/** Vùng pixel trên video tương ứng phần nhìn thấy trong khung cw×ch (object-cover). */
export function visibleVideoCropPixels(
  vw: number,
  vh: number,
  cw: number,
  ch: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (vw < 2 || vh < 2 || cw < 2 || ch < 2) {
    return { sx: 0, sy: 0, sw: Math.max(1, vw), sh: Math.max(1, vh) }
  }
  const S = Math.max(cw / vw, ch / vh)
  const Vw = vw * S
  const Vh = vh * S
  const ox = (cw - Vw) / 2
  const oy = (ch - Vh) / 2
  const vx0 = Math.max(0, (-ox) / S)
  const vx1 = Math.min(vw, (cw - ox) / S)
  const vy0 = Math.max(0, (-oy) / S)
  const vy1 = Math.min(vh, (ch - oy) / S)
  if (vx1 <= vx0 || vy1 <= vy0) {
    return { sx: 0, sy: 0, sw: vw, sh: vh }
  }
  const sx = Math.max(0, Math.floor(vx0))
  const sy = Math.max(0, Math.floor(vy0))
  const sw = Math.max(1, Math.min(vw - sx, Math.ceil(vx1) - sx))
  const sh = Math.max(1, Math.min(vh - sy, Math.ceil(vy1) - sy))
  return { sx, sy, sw, sh }
}

export function cropNormRectToFullVideo(
  rect: PyBarcodeNormRect,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  vw: number,
  vh: number,
): PyBarcodeNormRect {
  return {
    x: (sx + rect.x * sw) / vw,
    y: (sy + rect.y * sh) / vh,
    w: (rect.w * sw) / vw,
    h: (rect.h * sh) / vh,
  }
}

export function cropNormPolyToFullVideo(
  poly: PyBarcodeNormPoint[],
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  vw: number,
  vh: number,
): PyBarcodeNormPoint[] {
  return poly.map((p) => ({
    x: (sx + p.x * sw) / vw,
    y: (sy + p.y * sh) / vh,
  }))
}

export function jpegOutputSizeForCrop(
  sw: number,
  sh: number,
  maxSide: number,
): { tw: number; th: number } {
  const ar = sw / sh
  if (sw >= sh) {
    const tw = Math.min(sw, maxSide)
    const th = Math.max(2, Math.round(tw / ar))
    return { tw: Math.max(2, tw), th }
  }
  const th = Math.min(sh, maxSide)
  const tw = Math.max(2, Math.round(th * ar))
  return { tw, th: Math.max(2, th) }
}

export async function getUserMediaWithVideoFallback(): Promise<MediaStream> {
  let last: unknown
  for (const c of VIDEO_CHAIN) {
    try {
      return await navigator.mediaDevices.getUserMedia(c)
    } catch (e) {
      last = e
      if (
        e instanceof DOMException &&
        (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError')
      ) {
        continue
      }
      throw e
    }
  }
  throw last
}

export async function applyContinuousFocus(track: MediaStreamTrack): Promise<void> {
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' }, { exposureMode: 'continuous' }],
    } as unknown as MediaTrackConstraints)
  } catch {
    /* ignore */
  }
}
