import type { Order, OrderPayment, OrderStatus } from '@/types/pos'
import { apiRequest } from '@/services/apiClient'

export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  hasNext: boolean
}

export type OrderItemCreate = {
  productId: number
  quantity: number
  unitPrice?: number
}

export type CreateOrderInput = {
  status: OrderStatus
  customerName?: string | null
  paidAmount?: number | null
  items: OrderItemCreate[]
}

export type CreateOrderPaymentInput = {
  amount: number
  note?: string | null
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
  page(opts: {
    q?: string
    status?: OrderStatus | 'ALL' | null
    totalMin?: number | null
    totalMax?: number | null
    sortBy?: 'id' | 'totalAmount' | 'customerName' | 'createdAt'
    sortDir?: 'asc' | 'desc'
    page?: number
    size?: number
  }): Promise<PageResponse<Order>> {
    const params = new URLSearchParams()
    const q = (opts.q ?? '').trim()
    if (q) params.set('q', q)
    if (opts.status && opts.status !== 'ALL') params.set('status', opts.status)
    if (opts.totalMin != null) params.set('totalMin', String(opts.totalMin))
    if (opts.totalMax != null) params.set('totalMax', String(opts.totalMax))
    if (opts.sortBy) params.set('sortBy', opts.sortBy)
    if (opts.sortDir) params.set('sortDir', opts.sortDir)
    params.set('page', String(Math.max(0, Math.floor(opts.page ?? 0))))
    params.set('size', String(Math.max(1, Math.floor(opts.size ?? 20))))
    return apiRequest<PageResponse<Order>>(`/api/orders/page?${params.toString()}`)
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

  listPayments(orderId: number): Promise<OrderPayment[]> {
    return apiRequest<OrderPayment[]>(`/api/orders/${orderId}/payments`)
  },

  addPayment(orderId: number, input: CreateOrderPaymentInput): Promise<Order> {
    return apiRequest<Order>(`/api/orders/${orderId}/payments`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}

