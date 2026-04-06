/** Tọa độ chuẩn hoá 0..1 theo chiều video/crop gửi server. */
export type PyBarcodeNormPoint = { x: number; y: number }
export type PyBarcodeNormRect = { x: number; y: number; w: number; h: number }

export type PyBarcodeDetectPayload = {
  type: 'detect'
  frameId?: number
  found: boolean
  text?: string
  format?: string
  rect?: PyBarcodeNormRect
  polygon?: PyBarcodeNormPoint[]
}

export type PyBarcodeFrameCropMeta = {
  sx: number
  sy: number
  sw: number
  sh: number
  vw: number
  vh: number
}

export type PyBarcodeOverlayState = {
  rect: PyBarcodeNormRect | null
  polygon: PyBarcodeNormPoint[] | null
  vw: number
  vh: number
  until: number
}
