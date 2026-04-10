export type SettingPublic = {
  storeName: string
}

export type Setting = {
  storeName: string
  enableQr: boolean
  enableCard: boolean
  enablePrint: boolean
  darkMode: boolean
}

export type SettingUpdatePayload = {
  storeName?: string
  enableQr?: boolean
  enableCard?: boolean
  enablePrint?: boolean
  darkMode?: boolean
  currentPin?: string
  newPin?: string
}

export type PinVerifyResult = {
  expiresAtEpochSeconds: number
  token: string
}
