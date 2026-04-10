import type { OrderStatus, Product } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type OrderFormValue = {
  status: OrderStatus
  items: Array<{ productId: number | null; quantity: number }>
}

export const emptyOrderForm: OrderFormValue = {
  status: 'PENDING',
  items: [{ productId: null, quantity: 1 }],
}

export function validateOrderForm(input: OrderFormValue) {
  const errors: Partial<Record<keyof OrderFormValue, string>> = {}
  const hasInvalidQty = input.items.some((it) => !Number.isInteger(it.quantity) || it.quantity < 1)
  const hasMissingProduct = input.items.some((it) => it.productId == null)
  if (input.items.length === 0) errors.items = 'Vui lòng thêm ít nhất 1 sản phẩm.'
  if (hasMissingProduct) errors.items = 'Vui lòng chọn sản phẩm cho tất cả dòng.'
  if (hasInvalidQty) errors.items = 'Số lượng phải là số nguyên >= 1.'
  return errors
}

export function OrderForm({
  value,
  onChange,
  errors,
  products,
}: {
  value: OrderFormValue
  onChange: (next: OrderFormValue) => void
  errors: Partial<Record<keyof OrderFormValue, string>>
  products: Product[]
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="status">Trạng thái</Label>
        <select
          id="status"
          className={cn(
            'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs',
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          )}
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as OrderStatus })}
        >
          <option value="PENDING">Chờ thanh toán</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="CANCELLED">Đã huỷ</option>
        </select>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Sản phẩm</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                items: [...value.items, { productId: null, quantity: 1 }],
              })
            }
          >
            + Thêm dòng
          </Button>
        </div>

        <div className="grid gap-2">
          {value.items.map((it, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <select
                className={cn(
                  'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs',
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                )}
                value={it.productId ?? ''}
                onChange={(e) => {
                  const productId = e.target.value === '' ? null : Number(e.target.value)
                  const next = value.items.map((x, i) => (i === idx ? { ...x, productId } : x))
                  onChange({ ...value, items: next })
                }}
              >
                <option value="">Chọn sản phẩm…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              </select>

              <Input
                value={String(it.quantity)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '')
                  const q = raw === '' ? 1 : Number(raw)
                  const next = value.items.map((x, i) => (i === idx ? { ...x, quantity: q } : x))
                  onChange({ ...value, items: next })
                }}
                inputMode="numeric"
                placeholder="SL"
              />

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  const next = value.items.filter((_, i) => i !== idx)
                  onChange({ ...value, items: next })
                }}
              >
                Xoá
              </Button>
            </div>
          ))}
        </div>

        {errors.items && <div className="text-sm text-destructive">{errors.items}</div>}
      </div>
    </div>
  )
}

