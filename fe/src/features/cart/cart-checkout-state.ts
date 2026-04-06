import type { Product } from '@/types/pos'

export type CartCheckoutItemState = {
  productId: number
  productName: string
  barcode: string
  quantity: number
  unitPrice: number
}

export type CartCheckoutState = {
  items?: CartCheckoutItemState[]
  /** Snapshot giỏ để quay lại /cart mà không mất. */
  restore?: {
    products: Product[]
    draftPrices: Record<number, string>
  }
}
