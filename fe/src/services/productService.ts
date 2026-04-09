import type { CreateProductInput, Product } from '@/types/pos'
import { apiRequest } from '@/services/apiClient'

export type PageResponse<T> = {
  items: T[]
  page: number
  size: number
  hasNext: boolean
}

export const productService = {
  list(opts?: { deleted?: boolean }): Promise<Product[]> {
    const params = new URLSearchParams()
    if (opts?.deleted) params.set('deleted', 'true')
    const qs = params.toString()
    return apiRequest<Product[]>(`/api/products${qs ? `?${qs}` : ''}`)
  },
  page(opts: {
    q?: string
    deleted?: boolean
    priceMin?: number | null
    priceMax?: number | null
    sortBy?: 'id' | 'price' | 'name' | 'updatedAt'
    sortDir?: 'asc' | 'desc'
    page?: number
    size?: number
  }): Promise<PageResponse<Product>> {
    const params = new URLSearchParams()
    const q = (opts.q ?? '').trim()
    if (q) params.set('q', q)
    if (opts.deleted) params.set('deleted', 'true')
    if (opts.priceMin != null) params.set('priceMin', String(opts.priceMin))
    if (opts.priceMax != null) params.set('priceMax', String(opts.priceMax))
    if (opts.sortBy) params.set('sortBy', opts.sortBy)
    if (opts.sortDir) params.set('sortDir', opts.sortDir)
    params.set('page', String(Math.max(0, Math.floor(opts.page ?? 0))))
    params.set('size', String(Math.max(1, Math.floor(opts.size ?? 20))))
    return apiRequest<PageResponse<Product>>(`/api/products/page?${params.toString()}`)
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

