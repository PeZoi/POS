import type { Product } from '@/types/pos'
import { digitsOnly } from '@/utils/priceDigits'

export type CartLine = {
  product: Product
  quantity: number
}

export function cartLinesFromProducts(products: Product[]): CartLine[] {
  const order: number[] = []
  const map = new Map<number, CartLine>()

  for (const p of products) {
    if (!map.has(p.id)) {
      order.push(p.id)
      map.set(p.id, { product: p, quantity: 1 })
    } else {
      map.get(p.id)!.quantity += 1
    }
  }

  return order.map((id) => map.get(id)!)
}

export function effectiveUnitFromDraft(
  productId: number,
  fallback: number,
  draftPrices: Record<number, string>,
): number {
  const raw = draftPrices[productId]
  const digits = raw !== undefined ? digitsOnly(raw) : ''
  if (!digits.length) return fallback
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function cartGrandTotal(
  products: Product[],
  draftPrices: Record<number, string>,
): number {
  const lines = cartLinesFromProducts(products)
  return lines.reduce(
    (sum, line) =>
      sum +
      effectiveUnitFromDraft(line.product.id, line.product.price, draftPrices) *
        line.quantity,
    0,
  )
}
