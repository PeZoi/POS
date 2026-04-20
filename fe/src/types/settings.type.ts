export type SettingPublic = {
  storeName: string
}

export type Setting = {
  storeName: string
  enableQr: boolean
  enableCard: boolean
  enablePrint: boolean
  darkMode: boolean
  scanbotLicenseKey: string
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
  scanbotLicenseKey?: string
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

export type SqlBackupNowResult = {
  ok: boolean
  message: string
  database: string | null
  bytes: number
  finishedAt: string | null
}
