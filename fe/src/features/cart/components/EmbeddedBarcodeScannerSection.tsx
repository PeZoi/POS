import * as React from 'react'

import PyBarcodeScanner from '@/features/cart/components/PyBarcodeScanner'
import Scanner from '@/features/cart/components/Scanner'
import { ScannerModeMenu } from '@/features/cart/components/ScannerModeMenu'
import type { ScannerSettings } from '@/features/cart/scanner-config'
import type { ScannerModeId } from '@/features/cart/scanner-mode'
import { stopAllVideoStreamsUnderRoot } from '@/lib/camera-stream'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const ScanbotBarcodeScanner = React.lazy(
  () => import('@/features/cart/components/ScanbotBarcodeScanner'),
)

type PanelProps = {
  layout: 'panel'
  /** Mặc định camera tắt (giống trang giỏ). */
  defaultScannerActive?: boolean
  /**
   * Controlled mode (optional): parent quyết định camera đang bật/tắt.
   * Nếu truyền prop này, state nội bộ sẽ không tự quản lý nữa.
   */
  scannerActive?: boolean
  onScannerActiveChange?: (active: boolean) => void
}

type EmbeddedProps = {
  layout: 'embedded'
}

type EmbeddedBarcodeScannerSectionBaseProps = {
  onScan: (code: string) => void | Promise<void>
  settings: ScannerSettings
  scannerMode: ScannerModeId
  onScannerModeChange: (mode: ScannerModeId) => void
}

export type EmbeddedBarcodeScannerSectionProps =
  EmbeddedBarcodeScannerSectionBaseProps & (PanelProps | EmbeddedProps)

/**
 * Khối camera quét barcode dùng chung: Scanbot / Python / HTML5, fallback giống trang giỏ.
 * - `layout="panel"`: hàng "Camera quét" + nút Bật/tắt + placeholder.
 * - `layout="embedded"`: chỉ phần chọn mode + viewport (dùng trong modal form).
 */
export function EmbeddedBarcodeScannerSection(
  props: EmbeddedBarcodeScannerSectionProps,
) {
  const {
    onScan,
    settings,
    scannerMode,
    onScannerModeChange,
    layout,
  } = props

  const [panelActive, setPanelActive] = React.useState(
    layout === 'panel' ? (props.defaultScannerActive ?? false) : false,
  )

  /** Embedded: mount = đang bật camera (parent unmount khi đóng). */
  const isControlled = layout === 'panel' && typeof props.scannerActive === 'boolean'
  const scannerActive =
    layout === 'panel'
      ? isControlled
        ? (props.scannerActive as boolean)
        : panelActive
      : true

  const didFallbackFromPythonRef = React.useRef(false)

  const onScanbotInitFailed = React.useCallback(() => {
    onScannerModeChange('python')
  }, [onScannerModeChange])

  const onPythonScannerError = React.useCallback(() => {
    if (didFallbackFromPythonRef.current) return
    didFallbackFromPythonRef.current = true
    onScannerModeChange('html5')
  }, [onScannerModeChange])

  React.useEffect(() => {
    if (scannerMode !== 'python' || !scannerActive) {
      didFallbackFromPythonRef.current = false
    }
  }, [scannerActive, scannerMode])

  React.useLayoutEffect(() => {
    if (scannerMode === 'html5' || scannerMode === 'python') {
      stopAllVideoStreamsUnderRoot()
    }
  }, [scannerMode])

  React.useLayoutEffect(() => {
    return () => {
      stopAllVideoStreamsUnderRoot()
    }
  }, [])

  const setPanelScannerActive = React.useCallback(
    (next: boolean) => {
      if (layout !== 'panel') return
      if (typeof props.onScannerActiveChange === 'function') {
        props.onScannerActiveChange(next)
        return
      }
      setPanelActive(next)
    },
    [layout, props],
  )

  const viewport = scannerActive ? (
    scannerMode === 'html5' ? (
      <Scanner embedded onScan={onScan} settings={settings} />
    ) : scannerMode === 'python' ? (
      <PyBarcodeScanner
        embedded
        onScan={onScan}
        settings={settings}
        onError={onPythonScannerError}
      />
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
          onScan={onScan}
          onInitFailed={onScanbotInitFailed}
          settings={settings}
        />
      </React.Suspense>
    )
  ) : null

  if (layout === 'embedded') {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Nguồn camera
          </span>
          <ScannerModeMenu
            value={scannerMode}
            onChange={onScannerModeChange}
          />
        </div>
        {viewport}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-2">
        <div className="text-sm font-medium text-foreground">Camera quét</div>
        <Button
          type="button"
          variant={scannerActive ? 'outline' : 'default'}
          size="sm"
          onClick={() => {
            if (scannerActive) {
              setPanelScannerActive(false)
              stopAllVideoStreamsUnderRoot()
              return
            }
            stopAllVideoStreamsUnderRoot()
            window.requestAnimationFrame(() => setPanelScannerActive(true))
          }}
        >
          {scannerActive ? 'Tắt camera' : 'Bật camera'}
        </Button>
      </div>

      {scannerActive ? (
        viewport
      ) : (
        <div className="px-4">
          <button
            type="button"
            className={cn(
              'w-full rounded-2xl border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-xs transition-colors',
              'hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            onClick={() => {
              stopAllVideoStreamsUnderRoot()
              window.requestAnimationFrame(() => setPanelScannerActive(true))
            }}
          >
            Nhấn <span className="font-semibold text-foreground">Bật camera</span>{' '}
            để bắt đầu quét.
          </button>
        </div>
      )}
    </>
  )
}
