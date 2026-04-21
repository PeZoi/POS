import { create } from 'zustand'

import { fetchPublicSettings, fetchSettings } from '@/services/settingsService'
import type { Setting, SettingPublic } from '@/types/settings.type'

type SettingsState = {
  /** Tên cửa hàng từ API public (màn hình PIN) */
  publicPreview: SettingPublic | null
  /** Cài đặt đầy đủ sau khi đã mở khoá */
  settings: Setting | null
  setSettings: (s: Setting | null) => void
  loadPublic: () => Promise<void>
  loadFull: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  publicPreview: null,
  settings: null,
  setSettings: (s) => set({ settings: s }),
  loadPublic: async () => {
    const publicPreview = await fetchPublicSettings()
    set({ publicPreview })
  },
  loadFull: async () => {
    const settings = await fetchSettings()
    set({ settings, publicPreview: { storeName: settings.storeName, activeDomain: settings.activeDomain } })
  },
}))
