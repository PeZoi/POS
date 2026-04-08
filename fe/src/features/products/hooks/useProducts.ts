import * as React from 'react'

import { productService } from '@/services/productService'
import type { Product, ProductsCreateFn, ProductsUpdateFn } from '@/types/pos'

export type { ProductsCreateFn, ProductsUpdateFn } from '@/types/pos'

export function useProducts(opts?: { deleted?: boolean }) {
  const [items, setItems] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await productService.list({ deleted: Boolean(opts?.deleted) })
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [opts?.deleted])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const create = React.useCallback<ProductsCreateFn>(async (input) => {
    const created = await productService.create(input)
    setItems((prev) => [created, ...prev])
    return created
  }, [])

  const update = React.useCallback<ProductsUpdateFn>(async (id, input) => {
    const updated = await productService.update(id, input)
    setItems((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }, [])

  const remove = React.useCallback(async (id: number) => {
    await productService.delete(id)
    setItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const restore = React.useCallback(async (id: number) => {
    const restored = await productService.restore(id)
    // Nếu đang xem danh sách "Đã xoá" thì bỏ khỏi list hiện tại.
    setItems((prev) => prev.filter((p) => p.id !== id))
    return restored
  }, [])

  return { items, loading, error, reload, create, update, remove, restore }
}

