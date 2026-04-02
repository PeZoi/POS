import * as React from 'react'

import type { CreateProductInput, Product } from '@/types/pos'
import { productService } from '@/services/productService'

export function useProducts() {
  const [items, setItems] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await productService.list()
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const create = React.useCallback(async (input: CreateProductInput) => {
    const created = await productService.create(input)
    setItems((prev) => [created, ...prev])
    return created
  }, [])

  const update = React.useCallback(async (id: number, input: CreateProductInput) => {
    const updated = await productService.update(id, input)
    setItems((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }, [])

  const remove = React.useCallback(async (id: number) => {
    await productService.delete(id)
    setItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { items, loading, error, reload, create, update, remove }
}

