import * as React from 'react'

import type { Order } from '@/types/pos'
import { orderService, type CreateOrderInput } from '@/services/orderService'

export function useOrders() {
  const [items, setItems] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await orderService.list()
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải hoá đơn.')
    } finally {
      setLoading(false)
    }
  }, [])

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

  return { items, loading, error, reload, create, update, remove, getById }
}

