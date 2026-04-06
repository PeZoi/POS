import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Product } from '@/types/pos'

export type CartState = {
  products: Product[]
  draftPrices: Record<number, string>
  clear: () => void
  setDraftPrice: (productId: number, raw: string) => void
  setProducts: (next: Product[] | ((prev: Product[]) => Product[])) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      products: [],
      draftPrices: {},
      clear: () => set({ products: [], draftPrices: {} }),
      setDraftPrice: (productId, raw) =>
        set((s) => ({ draftPrices: { ...s.draftPrices, [productId]: raw } })),
      setProducts: (next) =>
        set((s) => ({ products: typeof next === 'function' ? next(s.products) : next })),
    }),
    {
      name: 'pos:cart',
      partialize: (s) => ({ products: s.products, draftPrices: s.draftPrices }),
    },
  ),
)

