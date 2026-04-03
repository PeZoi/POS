import { Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useEffect, useMemo, useState } from 'react'

/**
 * Cấu hình dùng chung cho Camera nhanh (html5) và Scanbot — chỉ phần cơ bản:
 * cooldown và định dạng barcode (1D POS), không gồm QR.
 *
 * - Sửa `DEFAULT_SCANNER_SETTINGS` cho mặc định trong app.
 * - Tải đè từ server: `VITE_SCANNER_CONFIG_URL` → JSON partial (GET).
 */

export type ScannerBarcodeFormatId = 'EAN_13' | 'EAN_8' | 'CODE_128' | 'UPC_A' | 'UPC_E'

export type ScannerSettings = {
  /** Sau mỗi lần quét thành công, chờ trước khi quét tiếp (ms). */
  scanCooldownMs: number
  /** Cùng một mã đọc liên tiếp — khoảng cách tối thiểu (ms), chủ yếu cho Scanbot. */
  sameBarcodeCooldownMs: number
  /** Chỉ các định dạng barcode cần nhận (không có QR). */
  barcodeFormats: ScannerBarcodeFormatId[]
}

const FORMAT_WHITELIST = new Set<string>([
  'EAN_13',
  'EAN_8',
  'CODE_128',
  'UPC_A',
  'UPC_E',
])

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  scanCooldownMs: 1000,
  sameBarcodeCooldownMs: 900,
  barcodeFormats: ['EAN_13', 'EAN_8', 'CODE_128', 'UPC_A', 'UPC_E'],
}

const FORMAT_TO_HTML5: Record<ScannerBarcodeFormatId, Html5QrcodeSupportedFormats> = {
  EAN_13: Html5QrcodeSupportedFormats.EAN_13,
  EAN_8: Html5QrcodeSupportedFormats.EAN_8,
  CODE_128: Html5QrcodeSupportedFormats.CODE_128,
  UPC_A: Html5QrcodeSupportedFormats.UPC_A,
  UPC_E: Html5QrcodeSupportedFormats.UPC_E,
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function normalizeFormats(
  fromServer: unknown,
  fallback: ScannerBarcodeFormatId[],
): ScannerBarcodeFormatId[] {
  if (!Array.isArray(fromServer)) return [...fallback]
  const next = fromServer.filter(
    (x): x is ScannerBarcodeFormatId =>
      typeof x === 'string' && FORMAT_WHITELIST.has(x),
  )
  return next.length > 0 ? next : [...fallback]
}

type PartialScannerSettings = {
  scanCooldownMs?: number
  sameBarcodeCooldownMs?: number
  barcodeFormats?: ScannerBarcodeFormatId[]
}

export function mergeScannerSettings(
  partial: PartialScannerSettings | null | undefined,
  base: ScannerSettings = DEFAULT_SCANNER_SETTINGS,
): ScannerSettings {
  const p = partial ?? {}
  const merged: ScannerSettings = {
    scanCooldownMs: p.scanCooldownMs ?? base.scanCooldownMs,
    sameBarcodeCooldownMs: p.sameBarcodeCooldownMs ?? base.sameBarcodeCooldownMs,
    barcodeFormats: normalizeFormats(p.barcodeFormats, base.barcodeFormats),
  }
  merged.scanCooldownMs = clamp(merged.scanCooldownMs, 0, 30_000)
  merged.sameBarcodeCooldownMs = clamp(merged.sameBarcodeCooldownMs, 0, 30_000)
  return merged
}

export function html5FormatsFromConfig(
  ids: ScannerBarcodeFormatId[],
): Html5QrcodeSupportedFormats[] {
  return ids.map((id) => FORMAT_TO_HTML5[id])
}

/**
 * Map danh sách format đơn giản → `barcodeFormatConfigurations` của Scanbot (1D POS).
 * Luôn tắt QR và các mã 2D khác — chỉ nhận barcode 1D theo `ids`.
 */
export function scanbotBarcodeFormatConfigurationsFromIds(
  ids: ScannerBarcodeFormatId[],
): unknown[] {
  const wantUpcEan = ids.some(
    (x) => x === 'EAN_13' || x === 'EAN_8' || x === 'UPC_A' || x === 'UPC_E',
  )
  const wantCode128 = ids.includes('CODE_128')
  const out: unknown[] = []
  if (wantUpcEan) {
    out.push({
      _type: 'BarcodeFormatUpcEanConfiguration',
      ean8: ids.includes('EAN_8'),
      ean13: ids.includes('EAN_13'),
      upca: ids.includes('UPC_A'),
      upce: ids.includes('UPC_E'),
    })
  }
  if (wantCode128) {
    out.push({ _type: 'BarcodeFormatCode128Configuration' })
  }
  if (out.length === 0) {
    return scanbotBarcodeFormatConfigurationsFromIds(DEFAULT_SCANNER_SETTINGS.barcodeFormats)
  }
  /** Tắt QR / Micro QR / rMQR (Scanbot SDK). */
  out.push({
    _type: 'BarcodeFormatQRCodeConfiguration',
    qr: false,
    microQr: false,
    rmqr: false,
  })
  /** Không bật mã 2D nào (DataMatrix, Aztec, PDF417 trong nhóm common 2D, …). */
  out.push({
    _type: 'BarcodeFormatCommonTwoDConfiguration',
    formats: [],
  })
  return out
}

export async function fetchScannerSettingsOverride(
  url: string,
): Promise<PartialScannerSettings | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!data || typeof data !== 'object') return null
    return data as PartialScannerSettings
  } catch {
    return null
  }
}

/** Mặc định + (tuỳ chọn) merge từ `VITE_SCANNER_CONFIG_URL`. */
export function useScannerSettings(): ScannerSettings {
  const [remote, setRemote] = useState<PartialScannerSettings | null>(null)

  useEffect(() => {
    const raw = import.meta.env.VITE_SCANNER_CONFIG_URL
    const url = typeof raw === 'string' ? raw.trim() : ''
    if (!url) return

    let cancelled = false
    void fetchScannerSettingsOverride(url).then((partial) => {
      if (!cancelled && partial && Object.keys(partial).length > 0) {
        setRemote(partial)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(
    () => mergeScannerSettings(remote ?? undefined, DEFAULT_SCANNER_SETTINGS),
    [remote],
  )
}
