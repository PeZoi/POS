import type { CreateProductInput, Product } from '@/types/pos'
import { apiRequest } from '@/services/apiClient'

export const productService = {
  list(): Promise<Product[]> {
    return apiRequest<Product[]>('/api/products')
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
}

