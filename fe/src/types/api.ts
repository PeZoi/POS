export interface ApiResponse<T> {
  code: string
  message: string
  status: number
  data: T
  timestamp: string
}

