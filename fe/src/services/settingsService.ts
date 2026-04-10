import { apiRequest } from '@/services/apiClient'
import type { Setting, SettingPublic, SettingUpdatePayload } from '@/types/settings.type'

export async function fetchPublicSettings(): Promise<SettingPublic> {
  return apiRequest<SettingPublic>('/api/settings/public')
}

export async function fetchSettings(): Promise<Setting> {
  return apiRequest<Setting>('/api/settings')
}

export async function updateSettings(payload: SettingUpdatePayload): Promise<Setting> {
  return apiRequest<Setting>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
