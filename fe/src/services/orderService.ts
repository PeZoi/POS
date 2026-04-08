import type { Order, OrderStatus, PaymentMethod } from '@/types/pos'
import { apiRequest } from '@/services/apiClient'

export type OrderItemCreate = {
  productId: number
  quantity: number
  unitPrice?: number
}

export type CreateOrderInput = {
  paymentMethod: PaymentMethod | null
  status: OrderStatus
  customerName?: string | null
  paidAmount?: number | null
  items: OrderItemCreate[]
}

export const orderService = {
  list(): Promise<Order[]> {
    return apiRequest<Order[]>('/api/orders')
  },
  /** Tìm theo orderCode (contains) hoặc id (equals) (server). */
  search(q: string, status?: OrderStatus | 'ALL', limit = 50): Promise<Order[]> {
    const params = new URLSearchParams()
    params.set('q', q.trim())
    params.set('limit', String(limit))
    if (status && status !== 'ALL') params.set('status', status)
    return apiRequest<Order[]>(`/api/orders/search?${params.toString()}`)
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
  updateCustomerName(id: number, customerName: string | null): Promise<Order> {
    return apiRequest<Order>(`/api/orders/${id}/customer-name`, {
      method: 'PATCH',
      body: JSON.stringify({ customerName }),
    })
  },
  delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/orders/${id}`, { method: 'DELETE' })
  },
}

