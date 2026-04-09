import * as React from 'react'

import { productService } from '@/services/productService'
import type { Product, ProductsCreateFn, ProductsUpdateFn } from '@/types/pos'

export type { ProductsCreateFn, ProductsUpdateFn } from '@/types/pos'

export type ProductsPagingFilters = {
  q: string
  deleted: boolean
  priceMin: number | null
  priceMax: number | null
  sortBy?: 'id' | 'price' | 'name' | 'updatedAt'
  sortDir?: 'asc' | 'desc'
  size?: number
}

export function useProducts(filters?: ProductsPagingFilters) {
  const [items, setItems] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(0)
  const [hasNext, setHasNext] = React.useState(false)
  const requestIdRef = React.useRef(0)

  const reload = React.useCallback(async () => {
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setPage(0)
    setHasNext(false)
    setItems([])
    try {
      if (!filters) {
        const data = await productService.list({ deleted: false })
        if (requestIdRef.current !== id) return
        setItems(data)
        setHasNext(false)
        setPage(0)
        return
      }

      const res = await productService.page({
        q: filters.q,
        deleted: filters.deleted,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        page: 0,
        size: filters.size ?? 20,
      })
      if (requestIdRef.current !== id) return
      setItems(res.items)
      setPage(res.page)
      setHasNext(Boolean(res.hasNext))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [
    filters?.deleted,
    filters?.priceMax,
    filters?.priceMin,
    filters?.q,
    filters?.size,
    filters?.sortBy,
    filters?.sortDir,
  ])

  const loadMore = React.useCallback(async () => {
    if (!filters) return
    if (loading || !hasNext) return
    const nextPage = page + 1
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await productService.page({
        q: filters.q,
        deleted: filters.deleted,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        page: nextPage,
        size: filters.size ?? 20,
      })
      if (requestIdRef.current !== id) return
      setItems((prev) => [...prev, ...res.items])
      setPage(res.page)
      setHasNext(Boolean(res.hasNext))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải thêm sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [
    filters?.deleted,
    filters?.priceMax,
    filters?.priceMin,
    filters?.q,
    filters?.size,
    filters?.sortBy,
    filters?.sortDir,
    hasNext,
    loading,
    page,
  ])

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

  return { items, loading, error, hasNext, reload, loadMore, create, update, remove, restore }
}

