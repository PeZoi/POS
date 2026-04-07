import type { Product } from '@/types/pos'

export function normalizeProductSearchText(s: string) {
  return s.trim().toLowerCase()
}

export function productMatchesSearchQuery(product: Product, rawQuery: string) {
  const q = normalizeProductSearchText(rawQuery)
  if (q.length === 0) return true

  return (
    normalizeProductSearchText(product.name).includes(q) ||
    normalizeProductSearchText(product.barcode).includes(q)
  )
}

