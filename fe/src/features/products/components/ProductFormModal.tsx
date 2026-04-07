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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function ProductFormFields({
  value,
  onChange,
  errors,
}: {
  value: CreateProductInput
  onChange: (next: CreateProductInput) => void
  errors: Partial<Record<keyof CreateProductInput, string>>
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
        />
        {errors.name && <div className="text-sm text-destructive">{errors.name}</div>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="barcode">Barcode</Label>
        <Input
          id="barcode"
          value={value.barcode}
          onChange={(e) => onChange({ ...value, barcode: e.target.value })}
          placeholder="VD: 893..."
          inputMode="numeric"
          aria-invalid={Boolean(errors.barcode)}
        />
        {errors.barcode && (
          <div className="text-sm text-destructive">{errors.barcode}</div>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="price">Giá bán (VND)</Label>
          <Input
            id="price"
            value={String(value.price)}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, '')
              const next = raw === '' ? 0 : Number(raw)
              onChange({ ...value, price: Number.isFinite(next) ? next : 0 })
            }}
            inputMode="numeric"
            placeholder="59000"
            aria-invalid={Boolean(errors.price)}
          />
          {errors.price && <div className="text-sm text-destructive">{errors.price}</div>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="status">Trạng thái</Label>
          <select
            id="status"
            className={cn(
              'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value as ProductStatus })}
          >
            <option value="ACTIVE">Đang bán</option>
            <option value="INACTIVE">Tạm ngưng</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Tạo tự động</div>
          <div className="text-xs text-muted-foreground">
            Đánh dấu sản phẩm được tạo từ scan/import
          </div>
        </div>
        <Switch
          checked={value.isAutoCreated}
          onCheckedChange={(checked) => onChange({ ...value, isAutoCreated: checked })}
        />
      </div>
    </div>
  )
}

function validate(input: CreateProductInput) {
  const errors: Partial<Record<keyof CreateProductInput, string>> = {}

  if (normalize(input.name).length === 0) errors.name = 'Vui lòng nhập tên sản phẩm.'
  if (normalize(input.barcode).length === 0) errors.barcode = 'Vui lòng nhập barcode.'
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
    } else {
      setFormValue(emptyForm)
    }
    setFormErrors({})
  }, [open, editing])

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
      await onCreate(formValue)
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
      description="1 barcode = 1 sản phẩm."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={closeForm}>
            Huỷ
          </Button>
          <Button onClick={() => void submitForm()}>
            {editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      }
      size="lg"
    >
      <ProductFormFields value={formValue} onChange={setFormValue} errors={formErrors} />
    </Modal>
  )
}
