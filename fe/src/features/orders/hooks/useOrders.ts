import * as React from 'react'

import type { Order } from '@/types/pos'
import { orderService, type CreateOrderInput } from '@/services/orderService'

export type OrdersPagingFilters = {
  q: string
  status: import('@/types/pos').OrderStatus | 'ALL' | null
  totalMin: number | null
  totalMax: number | null
  sortBy?: 'id' | 'totalAmount' | 'customerName' | 'createdAt'
  sortDir?: 'asc' | 'desc'
  size?: number
}

export function useOrders(filters?: OrdersPagingFilters) {
  const [items, setItems] = React.useState<Order[]>([])
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
        const data = await orderService.list()
        if (requestIdRef.current !== id) return
        setItems(data)
        setHasNext(false)
        setPage(0)
        return
      }

      const res = await orderService.page({
        q: filters.q,
        status: filters.status,
        totalMin: filters.totalMin,
        totalMax: filters.totalMax,
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
      setError(e instanceof Error ? e.message : 'Không thể tải hoá đơn.')
    } finally {
      setLoading(false)
    }
  }, [
    filters?.q,
    filters?.status,
    filters?.totalMin,
    filters?.totalMax,
    filters?.sortBy,
    filters?.sortDir,
    filters?.size,
  ])

  const loadMore = React.useCallback(async () => {
    if (!filters) return
    if (loading || !hasNext) return
    const nextPage = page + 1
    const id = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await orderService.page({
        q: filters.q,
        status: filters.status,
        totalMin: filters.totalMin,
        totalMax: filters.totalMax,
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
      setError(e instanceof Error ? e.message : 'Không thể tải thêm hoá đơn.')
    } finally {
      setLoading(false)
    }
  }, [
    filters?.q,
    filters?.status,
    filters?.totalMin,
    filters?.totalMax,
    filters?.sortBy,
    filters?.sortDir,
    filters?.size,
    hasNext,
    loading,
    page,
  ])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const create = React.useCallback(async (input: CreateOrderInput) => {
    const created = await orderService.create(input)
    setItems((prev) => [created, ...prev])
    return created
  }, [])

  const update = React.useCallback(async (id: number, input: CreateOrderInput) => {
    const updated = await orderService.update(id, input)
    setItems((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }, [])

  const remove = React.useCallback(async (id: number) => {
    await orderService.delete(id)
    setItems((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const getById = React.useCallback(async (id: number) => {
    return orderService.getById(id)
  }, [])

  return { items, loading, error, hasNext, reload, loadMore, create, update, remove, getById }
}

