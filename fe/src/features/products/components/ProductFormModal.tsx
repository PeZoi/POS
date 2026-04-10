import * as React from 'react'

import type {
  CreateProductInput,
  Product,
  ProductStatus,
  ProductsCreateFn,
  ProductsUpdateFn,
} from '@/types/pos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { EmbeddedBarcodeScannerSection } from '@/features/cart/components/EmbeddedBarcodeScannerSection'
import { useScannerSettings } from '@/features/cart/scanner-config'
import type { ScannerModeId } from '@/features/cart/scanner-mode'
import { stopAllVideoStreamsUnderRoot } from '@/lib/camera-stream'
import { cn } from '@/lib/utils'
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'
import { ScanLine } from 'lucide-react'

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function ProductFormFields({
  value,
  onChange,
  errors,
  barcodeScannerOpen,
  onToggleBarcodeScanner,
  barcodeScannerSlot,
  priceRaw,
  onPriceRawChange,
  isEditing,
}: {
  value: CreateProductInput
  onChange: (next: CreateProductInput) => void
  errors: Partial<Record<keyof CreateProductInput, string>>
  barcodeScannerOpen: boolean
  onToggleBarcodeScanner: () => void
  barcodeScannerSlot: React.ReactNode
  priceRaw: string
  onPriceRawChange: (rawDigits: string) => void
  isEditing: boolean
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Tên sản phẩm</Label>
        <Input
          id="name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="VD: Gấu bông nhỏ"
          aria-invalid={Boolean(errors.name)}
          className="h-11 rounded-xl"
        />
        {errors.name && <div className="text-sm text-destructive">{errors.name}</div>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="barcode">Barcode</Label>
        <div className="relative">
          <button
            type="button"
            onClick={onToggleBarcodeScanner}
            className={cn(
              'absolute right-1.5 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition',
              'hover:bg-muted/80 hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              barcodeScannerOpen && 'bg-muted/60 text-foreground',
            )}
            aria-label={
              barcodeScannerOpen ? 'Đóng camera quét barcode' : 'Mở camera quét barcode'
            }
            title={
              barcodeScannerOpen ? 'Đóng camera' : 'Quét barcode bằng camera'
            }
          >
            <ScanLine className="size-4" aria-hidden />
          </button>
          <Input
            id="barcode"
            value={value.barcode}
            onChange={(e) => onChange({ ...value, barcode: e.target.value })}
            placeholder="VD: 893..."
            inputMode="numeric"
            aria-invalid={Boolean(errors.barcode)}
            className="h-11 rounded-xl pr-12"
          />
        </div>
        {errors.barcode && (
          <div className="text-sm text-destructive">{errors.barcode}</div>
        )}
        {barcodeScannerSlot}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="price">Giá bán (VND)</Label>
          <Input
            id="price"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            spellCheck={false}
            value={priceRaw === '' ? '' : formatThousandsComma(priceRaw)}
            onChange={(e) => {
              onPriceRawChange(stripLeadingZeros(digitsOnly(e.target.value)))
            }}
            placeholder="59000"
            aria-invalid={Boolean(errors.price)}
            className="h-11 rounded-xl tabular-nums"
            onBlur={(e) => {
              const digits = digitsOnly(e.currentTarget.value)
              if (digits === '') onPriceRawChange('0')
            }}
          />
          {errors.price && <div className="text-sm text-destructive">{errors.price}</div>}
        </div>

        {isEditing && (
          <div className="grid gap-2">
            <Label htmlFor="status">Trạng thái</Label>
            <select
              id="status"
              className={cn(
                'h-11 w-full rounded-xl border border-input bg-transparent px-3 text-base shadow-xs',
                'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
              value={value.status}
              onChange={(e) => onChange({ ...value, status: e.target.value as ProductStatus })}
            >
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Tạm ngưng</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

function validate(input: CreateProductInput) {
  const errors: Partial<Record<keyof CreateProductInput, string>> = {}

  if (normalize(input.name).length === 0) errors.name = 'Vui lòng nhập tên sản phẩm.'
  if (!Number.isInteger(input.price) || input.price < 0)
    errors.price = 'Giá phải là số nguyên không âm.'

  return errors
}

const emptyForm: CreateProductInput = {
  name: '',
  barcode: '',
  price: 0,
  status: 'ACTIVE',
  isAutoCreated: false,
}

export type ProductFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: Product | null
  existingBarcodes: Set<string>
  onCreate: ProductsCreateFn
  onUpdate: ProductsUpdateFn
}

export function ProductFormModal({
  open,
  onOpenChange,
  editing,
  existingBarcodes,
  onCreate,
  onUpdate,
}: ProductFormModalProps) {
  const [formValue, setFormValue] = React.useState<CreateProductInput>(emptyForm)
  const [formErrors, setFormErrors] = React.useState<
    Partial<Record<keyof CreateProductInput, string>>
  >({})
  const [priceRaw, setPriceRaw] = React.useState<string>('0')
  const [barcodeScannerOpen, setBarcodeScannerOpen] = React.useState(false)
  const [scannerMode, setScannerMode] = React.useState<ScannerModeId>('scanbot')
  const scannerSettings = useScannerSettings()

  const onPriceRawChange = React.useCallback((rawDigits: string) => {
    const d = rawDigits === '' ? '' : stripLeadingZeros(digitsOnly(rawDigits))
    setPriceRaw(d)
    const n = d === '' ? 0 : Number(d)
    setFormValue((prev) => ({ ...prev, price: Number.isFinite(n) ? n : 0 }))
  }, [])

  const toggleBarcodeScanner = React.useCallback(() => {
    if (barcodeScannerOpen) {
      setBarcodeScannerOpen(false)
      stopAllVideoStreamsUnderRoot()
      return
    }
    stopAllVideoStreamsUnderRoot()
    window.requestAnimationFrame(() => setBarcodeScannerOpen(true))
  }, [barcodeScannerOpen])

  const handleBarcodeScan = React.useCallback(async (code: string) => {
    setFormValue((prev) => ({ ...prev, barcode: code }))
    setBarcodeScannerOpen(false)
    stopAllVideoStreamsUnderRoot()
  }, [])

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setFormValue({
        name: editing.name,
        barcode: editing.barcode,
        price: editing.price,
        status: editing.status,
        isAutoCreated: editing.isAutoCreated,
      })
      setPriceRaw(String(Math.max(0, Math.floor(Number(editing.price)))))
    } else {
      setFormValue(emptyForm)
      setPriceRaw('0')
    }
    setFormErrors({})
    setBarcodeScannerOpen(false)
  }, [open, editing])

  React.useEffect(() => {
    if (!open) {
      setBarcodeScannerOpen(false)
      stopAllVideoStreamsUnderRoot()
    }
  }, [open])

  const closeForm = () => {
    onOpenChange(false)
  }

  const submitForm = async () => {
    const errors = validate(formValue)
    const barcodeNorm = normalize(formValue.barcode)
    const editingBarcodeNorm = editing ? normalize(editing.barcode) : null
    const barcodeAlreadyUsed =
      barcodeNorm.length > 0 &&
      existingBarcodes.has(barcodeNorm) &&
      barcodeNorm !== editingBarcodeNorm

    if (barcodeAlreadyUsed) errors.barcode = 'Barcode đã tồn tại (mỗi barcode = 1 sản phẩm).'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (!editing) {
      const resolvedBarcode =
        barcodeNorm.length > 0
          ? formValue.barcode.trim()
          : `MANUAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

      const name = formValue.name.trim().length > 0 ? formValue.name.trim() : `SP ${resolvedBarcode.slice(-6)}`

      await onCreate({
        ...formValue,
        name,
        barcode: resolvedBarcode,
        isAutoCreated: barcodeNorm.length === 0 ? true : formValue.isAutoCreated,
      })
      onOpenChange(false)
      return
    }

    await onUpdate(editing.id, formValue)
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) closeForm()
      }}
      title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={closeForm}
            className="h-11 rounded-xl px-5 text-base sm:px-6"
          >
            Huỷ
          </Button>
          <Button
            onClick={() => void submitForm()}
            className="h-11 rounded-xl px-5 text-base sm:px-6"
          >
            {editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      }
      size="lg"
    >
      <ProductFormFields
        value={formValue}
        onChange={setFormValue}
        errors={formErrors}
        barcodeScannerOpen={barcodeScannerOpen}
        onToggleBarcodeScanner={toggleBarcodeScanner}
        priceRaw={priceRaw}
        onPriceRawChange={onPriceRawChange}
        isEditing={Boolean(editing)}
        barcodeScannerSlot={
          barcodeScannerOpen ? (
            <EmbeddedBarcodeScannerSection
              layout="embedded"
              onScan={handleBarcodeScan}
              settings={scannerSettings}
              scannerMode={scannerMode}
              onScannerModeChange={setScannerMode}
            />
          ) : null
        }
      />
    </Modal>
  )
}
