import { apiRequest, setPosToken } from '@/services/apiClient'
import type { PinVerifyResult } from '@/types/settings.type'

export async function verifyPin(pin: string): Promise<PinVerifyResult> {
  const data = await apiRequest<PinVerifyResult>('/api/auth/pin/verify', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })
  setPosToken(data.token)
  return data
}
