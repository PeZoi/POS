export type SettingPublic = {
  storeName: string
}

export type Setting = {
  storeName: string
  enableQr: boolean
  enableCard: boolean
  enablePrint: boolean
  darkMode: boolean
  telegramEnabled: boolean
  backupEnabled: boolean
  backupTime: string
  lastBackupAt: string | null
}

export type SettingUpdatePayload = {
  storeName?: string
  enableQr?: boolean
  enableCard?: boolean
  enablePrint?: boolean
  darkMode?: boolean
  telegramEnabled?: boolean
  backupEnabled?: boolean
  backupTime?: string
  currentPin?: string
  newPin?: string
}

export type PinVerifyResult = {
  expiresAtEpochSeconds: number
  token: string
}
