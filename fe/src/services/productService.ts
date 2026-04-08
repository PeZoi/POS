import type { CreateProductInput, Product } from '@/types/pos'
import { apiRequest } from '@/services/apiClient'

export const productService = {
  list(opts?: { deleted?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams()
    if (opts?.deleted) params.set('deleted', 'true')
    const qs = params.toString()
    return apiRequest<Product[]>(`/api/products${qs ? `?${qs}` : ''}`)
  },
  /** Tìm theo tên hoặc barcode (server), mặc định tối đa 5 kết quả. */
  search(q: string, limit = 5, opts?: { deleted?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams()
    params.set('q', q.trim())
    params.set('limit', String(limit))
    if (opts?.deleted) params.set('deleted', 'true')
    return apiRequest<Product[]>(`/api/products/search?${params.toString()}`)
  },
  getById(id: number): Promise<Product> {
    return apiRequest<Product>(`/api/products/${id}`)
  },
  getByBarcode(barcode: string): Promise<Product> {
    return apiRequest<Product>(`/api/products/by-barcode/${encodeURIComponent(barcode)}`)
  },
  create(input: CreateProductInput): Promise<Product> {
    return apiRequest<Product>('/api/products', { method: 'POST', body: JSON.stringify(input) })
  },
  update(id: number, input: CreateProductInput): Promise<Product> {
    return apiRequest<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },
  delete(id: number): Promise<void> {
    return apiRequest<void>(`/api/products/${id}`, { method: 'DELETE' })
  },
  restore(id: number): Promise<Product> {
    return apiRequest<Product>(`/api/products/${id}/restore`, { method: 'PUT' })
  },
}

