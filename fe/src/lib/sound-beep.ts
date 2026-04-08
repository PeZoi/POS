let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return null
      audioCtx = new Ctx()
      masterGain = audioCtx.createGain()
      masterGain.gain.value = 0.9
      masterGain.connect(audioCtx.destination)
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Trình duyệt thường chặn WebAudio cho tới khi có user gesture.
 * Gọi hàm này trong một sự kiện click/touch để “mở khóa” âm thanh.
 */
export async function unlockAudio(): Promise<boolean> {
  try {
    const ctx = getAudioContext()
    if (!ctx) return false
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    // Play an inaudible blip to fully unlock on iOS/Safari.
    playBeep({ volume: 0.0001, durationMs: 10, frequencyHz: 1 })
    return true
  } catch {
    return false
  }
}

type BeepOptions = {
  /** Default: 920 */
  frequencyHz?: number
  /** Default: 95 */
  durationMs?: number
  /** Default: 0.14 */
  volume?: number
  /** Default: 'square' */
  type?: OscillatorType
}

/**
 * Beep mô phỏng bằng WebAudio oscillator (không phụ thuộc file wav/mp3).
 * Lưu ý: nếu chưa unlock, play có thể bị chặn (im lặng).
 */
export function playBeep(opts: BeepOptions = {}): void {
  try {
    const ctx = getAudioContext()
    const out = masterGain
    if (!ctx || !out) return
    if (ctx.state !== 'running') return

    const frequencyHz = opts.frequencyHz ?? 920
    const durationMs = opts.durationMs ?? 95
    const volume = opts.volume ?? 0.14
    const type = opts.type ?? 'square'

    const now = ctx.currentTime
    const dur = Math.max(0.01, durationMs / 1000)

    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(frequencyHz, now)

    const gain = ctx.createGain()
    // Envelope: nhanh, tránh click/pop
    const a = 0.002
    const r = 0.03
    gain.gain.setValueAtTime(0.00001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.00001, volume), now + a)
    gain.gain.setValueAtTime(Math.max(0.00001, volume), now + Math.max(a, dur - r))
    gain.gain.exponentialRampToValueAtTime(0.00001, now + dur)

    osc.connect(gain)
    gain.connect(out)

    osc.start(now)
    osc.stop(now + dur + 0.01)
    osc.onended = () => {
      try {
        osc.disconnect()
        gain.disconnect()
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}