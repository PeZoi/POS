import { getOrCreateDeviceId } from '@/constants/deviceId'
import { POS_TOKEN_KEY } from '@/constants/session'
import type { ApiResponse } from '@/types/api'

export function getPosToken(): string | null {
  try {
    return sessionStorage.getItem(POS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setPosToken(token: string) {
  try {
    sessionStorage.setItem(POS_TOKEN_KEY, token)
  } catch {
    // ignore
  }
}

export function clearPosToken() {
  try {
    sessionStorage.removeItem(POS_TOKEN_KEY)
  } catch {
    // ignore
  }
}

export const POS_SESSION_LOST_EVENT = 'pos:session-lost'

export class ApiError extends Error {
  status: number
  code?: string
  /** Chỉ khi HTTP 429 (PIN bị khóa tạm thời) */
  retryAfterSeconds?: number

  constructor(message: string, status: number, code?: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
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
  const token = getPosToken()
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-POS-Device-Id': getOrCreateDeviceId(),
      ...(token ? { 'X-POS-Token': token } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const json = (await readJsonSafely(res)) as ApiResponse<T> | null

  if (!res.ok) {
    const method = (init?.method ?? 'GET').toUpperCase()
    const isPinVerify =
      method === 'POST' && input.replace(/\/$/, '') === '/api/auth/pin/verify'
    if (res.status === 401 && token && !isPinVerify) {
      clearPosToken()
      window.dispatchEvent(new CustomEvent(POS_SESSION_LOST_EVENT))
    }
    const message = json?.message ?? res.statusText ?? 'Request failed'
    let retryAfterSeconds: number | undefined
    if (
      json &&
      typeof json === 'object' &&
      json.data != null &&
      typeof json.data === 'object' &&
      'retryAfterSeconds' in json.data
    ) {
      const v = (json.data as { retryAfterSeconds?: unknown }).retryAfterSeconds
      if (typeof v === 'number' && Number.isFinite(v)) {
        retryAfterSeconds = Math.ceil(v)
      }
    }
    throw new ApiError(message, res.status, json?.code, retryAfterSeconds)
  }

  if (!json) throw new ApiError('Empty response body', res.status)
  return json.data
}

