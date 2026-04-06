import type { Product } from '@/types/pos'

const CART_PRODUCTS_KEY = 'pos:cart:products'
const CART_DRAFT_PRICES_KEY = 'pos:cart:draft-prices'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function loadCartProducts(): Product[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(CART_PRODUCTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => isRecord(x) && typeof x.id === 'number') as Product[]
  } catch {
    return []
  }
}

export function saveCartProducts(products: Product[]): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(CART_PRODUCTS_KEY, JSON.stringify(products))
}

export function loadCartDraftPrices(): Record<number, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(CART_DRAFT_PRICES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return {}
    const out: Record<number, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      const id = Number(k)
      if (!Number.isFinite(id)) continue
      if (typeof v !== 'string') continue
      out[id] = v
    }
    return out
  } catch {
    return {}
  }
}

export function saveCartDraftPrices(draftPrices: Record<number, string>): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(CART_DRAFT_PRICES_KEY, JSON.stringify(draftPrices))
}

