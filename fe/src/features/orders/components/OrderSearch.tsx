import * as React from 'react'

import { Input } from '@/components/ui/input'
import type { Order, OrderStatus } from '@/types/pos'
import { orderService } from '@/services/orderService'
import { cn } from '@/lib/utils'

export type OrderSearchState = {
  query: string
  debouncedQuery: string
  loading: boolean
  error: string | null
  results: Order[]
}

export type OrderSearchProps = {
  value: string
  onValueChange: (value: string) => void
  status?: OrderStatus | 'ALL'
  placeholder?: string
  limit?: number
  debounceMs?: number
  className?: string
  inputClassName?: string
  disabled?: boolean
  onStateChange?: (state: OrderSearchState) => void
  leftIcon?: React.ReactNode
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

export function OrderSearch({
  value,
  onValueChange,
  status = 'ALL',
  placeholder = 'Tìm theo mã hoá đơn…',
  limit = 50,
  debounceMs = 320,
  className,
  inputClassName,
  disabled,
  onStateChange,
  leftIcon,
}: OrderSearchProps) {
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [results, setResults] = React.useState<Order[]>([])
  const [loading, setLoading] = React.useState(false)
  const requestIdRef = React.useRef(0)

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(normalize(value))
    }, debounceMs)
    return () => window.clearTimeout(t)
  }, [value, debounceMs])

  React.useEffect(() => {
    const q = normalize(debouncedQuery)
    if (!q) {
      setResults([])
      setLoading(false)
      onStateChange?.({
        query: value,
        debouncedQuery: '',
        loading: false,
        error: null,
        results: [],
      })
      return
    }

    const id = ++requestIdRef.current
    setLoading(true)
    onStateChange?.({
      query: value,
      debouncedQuery: q,
      loading: true,
      error: null,
      results,
    })

    orderService
      .search(q, status, limit)
      .then((list) => {
        if (requestIdRef.current !== id) return
        setResults(list)
        setLoading(false)
        onStateChange?.({
          query: value,
          debouncedQuery: q,
          loading: false,
          error: null,
          results: list,
        })
      })
      .catch(() => {
        if (requestIdRef.current !== id) return
        setResults([])
        setLoading(false)
        onStateChange?.({
          query: value,
          debouncedQuery: q,
          loading: false,
          error: 'Không tải được kết quả tìm kiếm.',
          results: [],
        })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, status, limit])

  return (
    <div className={cn('relative w-full', className)}>
      {leftIcon}
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(inputClassName)}
        aria-busy={loading}
      />
    </div>
  )
}

