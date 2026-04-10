const DEVICE_KEY = 'pos_device_id'

/**
 * UUID co dinh tren trinh duyet (localStorage) — backend dung de khoa PIN theo thiet bi.
 */
export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'fallback-' + Math.random().toString(36).slice(2)
  }
}
