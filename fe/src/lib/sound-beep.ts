import beepMp3Url from '@/assets/beep.wav'

let audioEl: HTMLAudioElement | null = null

function ensureAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioEl) {
      audioEl = new Audio(beepMp3Url)
      audioEl.preload = 'auto'
      // iOS: playsInline helps keep it from fullscreen media UI.
      ;(audioEl as unknown as { playsInline?: boolean }).playsInline = true
    }
    return audioEl
  } catch {
    return null
  }
}

/**
 * Trình duyệt thường chặn WebAudio cho tới khi có user gesture.
 * Gọi hàm này trong một sự kiện click/touch để “mở khóa” âm thanh.
 */
export async function unlockAudio(): Promise<boolean> {
  const el = ensureAudioElement()
  try {
    if (el) {
      el.currentTime = 0
      const p = el.play()
      if (p && typeof (p as Promise<void>).then === 'function') {
        await p
      }
      el.pause()
    }
    return true
  } catch {
    return false
  }
}

/** POS beep từ file mp3 (ổn định hơn WebAudio trên mobile). */
export function playBeep(): void {
  void (async () => {
    try {
      const el = ensureAudioElement()
      if (!el) return
      el.currentTime = 0
      // Nếu bị chặn autoplay, play() sẽ reject — im lặng, user có thể bấm “Bật âm / Test beep”.
      void el.play().catch(() => {})
    } catch {
      /* ignore */
    }
  })()
}