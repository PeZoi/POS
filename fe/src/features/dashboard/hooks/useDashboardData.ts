import * as React from 'react'

import { orderService } from '@/services/orderService'
import { productService } from '@/services/productService'
import type { Order, Product } from '@/types/pos'

export type DashboardLoadState = 'idle' | 'loading' | 'success' | 'error'

export function useDashboardData() {
  const [state, setState] = React.useState<DashboardLoadState>('idle')
  const [products, setProducts] = React.useState<Product[]>([])
  const [orders, setOrders] = React.useState<Order[]>([])

  const load = React.useCallback(() => {
    let alive = true
    setState('loading')
    void (async () => {
      try {
        const [p, o] = await Promise.all([productService.list(), orderService.list()])
        if (!alive) return
        setProducts(p)
        setOrders(o)
        setState('success')
      } catch {
        if (!alive) return
        setProducts([])
        setOrders([])
        setState('error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    const cancel = load()
    return cancel
  }, [load])

  return { state, products, orders, reload: load }
}
