import type { ApiResponse } from '@/types/api'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function readJsonSafely(res: Response) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

export async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const json = (await readJsonSafely(res)) as ApiResponse<T> | null

  if (!res.ok) {
    const message = json?.message ?? res.statusText ?? 'Request failed'
    throw new ApiError(message, res.status, json?.code)
  }

  if (!json) throw new ApiError('Empty response body', res.status)
  return json.data
}

