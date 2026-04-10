import { Delete } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { verifyPin } from '@/services/pinAuthService'
import { ApiError } from '@/services/apiClient'

const PIN_LEN = 4

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'back'],
] as const

type PinUnlockScreenProps = {
  storeName: string
  onUnlocked: () => void
}

export function PinUnlockScreen({ storeName, onUnlocked }: PinUnlockScreenProps) {
  const [pin, setPin] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [shake, setShake] = React.useState(false)
  const [lockSecondsRemaining, setLockSecondsRemaining] = React.useState<number | null>(null)

  const keypadLocked = lockSecondsRemaining != null && lockSecondsRemaining > 0

  const triggerShake = React.useCallback(() => {
    setShake(true)
    window.setTimeout(() => setShake(false), 420)
  }, [])

  React.useEffect(() => {
    if (lockSecondsRemaining == null || lockSecondsRemaining <= 0) return
    const id = window.setInterval(() => {
      setLockSecondsRemaining((s) => {
        if (s == null || s <= 1) return null
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [lockSecondsRemaining])

  const submit = React.useCallback(
    async (value: string) => {
      if (keypadLocked) return
      if (value.length !== PIN_LEN) return
      setLoading(true)
      setError(null)
      try {
        await verifyPin(value)
        setLockSecondsRemaining(null)
        onUnlocked()
      } catch (e) {
        setPin('')
        if (e instanceof ApiError && e.retryAfterSeconds != null && e.retryAfterSeconds > 0) {
          setLockSecondsRemaining(Math.ceil(e.retryAfterSeconds))
          setError(e.message)
        } else {
          const msg = e instanceof ApiError ? e.message : 'Không thể xác thực'
          setError(msg)
          triggerShake()
        }
      } finally {
        setLoading(false)
      }
    },
    [onUnlocked, triggerShake, keypadLocked],
  )

  React.useEffect(() => {
    if (keypadLocked) return
    if (pin.length === PIN_LEN) {
      void submit(pin)
    }
  }, [pin, submit, keypadLocked])

  const append = (d: string) => {
    if (loading || keypadLocked || pin.length >= PIN_LEN) return
    setError(null)
    setPin((p) => p + d)
  }

  const backspace = () => {
    if (loading || keypadLocked) return
    setError(null)
    setPin((p) => p.slice(0, -1))
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0a0a0c] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 255, 0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(255, 90, 120, 0.12), transparent)',
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col items-center pt-8 text-center">
          <div className="grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_40px_rgba(255,255,255,0.06)] backdrop-blur-md">
            <span className="text-2xl font-semibold tracking-tight">POS</span>
          </div>
          <h1 className="mt-6 text-balance text-xl font-medium tracking-tight text-white/95">
            {storeName}
          </h1>
          <p className="mt-2 text-sm text-white/45">Nhập mã PIN để tiếp tục</p>

          <div
            className={cn(
              'mt-10 flex justify-center gap-2.5 transition-transform',
              shake && 'animate-[pin-shake_0.42s_ease-in-out]',
            )}
            role="status"
            aria-live="polite"
          >
            {Array.from({ length: PIN_LEN }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'size-3.5 rounded-full border transition-all duration-200',
                  i < pin.length
                    ? 'scale-105 border-white/20 bg-white'
                    : 'border-white/25 bg-transparent',
                )}
              />
            ))}
          </div>

          {error ? (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-center text-sm text-rose-300/90" role="alert">
                {error}
              </p>
              {keypadLocked && lockSecondsRemaining != null ? (
                <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-amber-200/95">
                  {lockSecondsRemaining}s
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-center text-xs text-white/35">
              Nhập đúng 4 chữ số · tự gửi khi nhập xong
            </p>
          )}
        </div>

        <div className="mt-auto grid gap-3">
          {KEYS.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 gap-3">
              {row.map((cell, ci) => {
                const k = `${ri}-${ci}`
                if (cell === null) {
                  return <div key={k} />
                }
                if (cell === 'back') {
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-label="Xoá"
                      disabled={loading || keypadLocked || pin.length === 0}
                      onClick={backspace}
                      className={cn(
                        'flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors',
                        'hover:bg-white/10 active:scale-[0.98] disabled:opacity-30',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      )}
                    >
                      <Delete className="size-5" strokeWidth={1.75} />
                    </button>
                  )
                }
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={loading || keypadLocked || pin.length >= PIN_LEN}
                    onClick={() => append(cell)}
                    className={cn(
                      'h-14 rounded-full border border-white/10 bg-white/5 text-lg font-medium tracking-wide text-white transition-colors',
                      'hover:bg-white/12 active:scale-[0.98] disabled:opacity-40',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                    )}
                  >
                    {cell}
                  </button>
                )
              })}
            </div>
          ))}

          <button
            type="button"
            disabled={loading || keypadLocked || pin.length !== PIN_LEN}
            onClick={() => void submit(pin)}
            className={cn(
              'mt-1 h-12 w-full rounded-2xl bg-white text-sm font-semibold text-zinc-900 transition-opacity',
              'hover:bg-white/95 active:scale-[0.99] disabled:opacity-35',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            )}
          >
            {loading ? 'Đang kiểm tra…' : keypadLocked ? 'Đang khóa…' : 'Mở khoá'}
          </button>
        </div>
      </div>
    </div>
  )
}
