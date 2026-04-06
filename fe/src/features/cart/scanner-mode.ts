export type ScannerModeId = 'html5' | 'scanbot' | 'python'

export const SCANNER_MODES: { id: ScannerModeId; label: string }[] = [
  { id: 'scanbot', label: 'Scanbot' },
  { id: 'python', label: 'Python' },
  { id: 'html5', label: 'Camera nhanh' },
]

export function scannerModeLabel(mode: ScannerModeId): string {
  return SCANNER_MODES.find((m) => m.id === mode)?.label ?? mode
}
