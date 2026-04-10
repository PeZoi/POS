import type { OrderStatus } from '@/types/pos'

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

