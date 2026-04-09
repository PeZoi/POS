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

/** Giá trị số từ query string (VND), không hợp lệ → null */
export function parsePriceSearchParam(raw: string | null): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number(String(raw).replace(/\s/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

/** Đọc priceMin / priceMax từ URL; nếu min > max thì đổi chỗ để khoảng hợp lệ */
export function priceBoundsFromSearchParams(sp: URLSearchParams): {
  min: number | null
  max: number | null
} {
  let min = parsePriceSearchParam(sp.get('priceMin'))
  let max = parsePriceSearchParam(sp.get('priceMax'))
  if (min != null && max != null && min > max) {
    ;[min, max] = [max, min]
  }
  return { min, max }
}

export function productMatchesPriceRange(
  price: number,
  min: number | null,
  max: number | null,
): boolean {
  if (min != null && price < min) return false
  if (max != null && price > max) return false
  return true
}

