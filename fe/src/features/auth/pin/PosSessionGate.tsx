import * as React from 'react'

import { PinUnlockScreen } from '@/features/auth/pin/components/PinUnlockScreen'
import { POS_SESSION_LOST_EVENT, getPosToken } from '@/services/apiClient'
import { useSettingsStore } from '@/store/settingsStore'

type PosSessionGateProps = {
  children: React.ReactNode
}

function DarkModeSync() {
  const darkMode = useSettingsStore((s) => s.settings?.darkMode)
  React.useEffect(() => {
    if (typeof darkMode === 'boolean') {
      document.documentElement.classList.toggle('dark', darkMode)
    }
  }, [darkMode])
  return null
}

export function PosSessionGate({ children }: PosSessionGateProps) {
  const [phase, setPhase] = React.useState<'loading' | 'locked' | 'ready'>('loading')
  const loadPublic = useSettingsStore((s) => s.loadPublic)
  const loadFull = useSettingsStore((s) => s.loadFull)
  const publicPreview = useSettingsStore((s) => s.publicPreview)

  const tryResume = React.useCallback(async () => {
    setPhase('loading')
    await loadPublic()
    const token = getPosToken()
    if (!token) {
      setPhase('locked')
      return
    }
    try {
      await loadFull()
      setPhase('ready')
    } catch {
      setPhase('locked')
    }
  }, [loadFull, loadPublic])

  React.useEffect(() => {
    void tryResume()
  }, [tryResume])

  React.useEffect(() => {
    const onLost = () => {
      setPhase('locked')
    }
    window.addEventListener(POS_SESSION_LOST_EVENT, onLost)
    return () => window.removeEventListener(POS_SESSION_LOST_EVENT, onLost)
  }, [])

  const onUnlocked = React.useCallback(async () => {
    await loadFull()
    setPhase('ready')
  }, [loadFull])

  if (phase === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-background text-muted-foreground">
        <div className="text-sm">Đang tải…</div>
      </div>
    )
  }

  if (phase === 'locked') {
    return (
      <PinUnlockScreen
        storeName={publicPreview?.storeName ?? 'POS'}
        onUnlocked={() => void onUnlocked()}
      />
    )
  }

  return (
    <>
      <DarkModeSync />
      {children}
    </>
  )
}
