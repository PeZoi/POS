export type IsoDateTimeString = string

export type ProductStatus = 'ACTIVE' | 'INACTIVE'

export interface Product {
  id: number
  name: string
  barcode: string
  price: number
  status: ProductStatus
  isAutoCreated: boolean
  createdAt?: IsoDateTimeString
  updatedAt?: IsoDateTimeString
}

export type CreateProductInput = Pick<
  Product,
  'name' | 'barcode' | 'price' | 'status' | 'isAutoCreated'
>
export type UpdateProductInput = Partial<CreateProductInput>

export type PaymentMethod = 'CASH' | 'QR' | 'CARD'
export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED'

export interface Order {
  id: number
  orderCode?: string
  totalAmount: number | null
  paymentMethod: PaymentMethod | null
  status: OrderStatus | null
  createdAt?: IsoDateTimeString
  items?: OrderItemDetail[]
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  price: number
  quantity: number
  subtotal: number
}

export interface OrderItemDetail {
  id: number
  productId: number
  productName: string
  barcode: string
  price: number
  quantity: number
  subtotal: number
}

