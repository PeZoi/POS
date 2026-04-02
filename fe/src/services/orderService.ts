import type { Order, OrderStatus, PaymentMethod } from '@/types/pos'
import { apiRequest } from '@/services/apiClient'

export type OrderItemCreate = {
  productId: number
  quantity: number
}

export type CreateOrderInput = {
  paymentMethod: PaymentMethod | null
  status: OrderStatus
  items: OrderItemCreate[]
}

export const orderService = {
  list(): Promise<Order[]> {
    return apiRequest<Order[]>('/api/orders')
  },
  getById(id: number): Promise<Order> {
    return apiRequest<Order>(`/api/orders/${id}`)
  },
  create(input: CreateOrderInput): Promise<Order> {
    return apiRequest<Order>('/api/orders', { method: 'POST', body: JSON.stringify(input) })
  },
  update(id: number, input: CreateOrderInput): Promise<Order> {
    return apiRequest<Order>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  },
  delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/orders/${id}`, { method: 'DELETE' })
  },
}

