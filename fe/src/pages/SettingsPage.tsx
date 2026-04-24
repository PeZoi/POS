import * as React from 'react'
import { Bell, Cog, Database, KeyRound, Store } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { backupSqlNow, updateSettings } from '@/services/settingsService'
import { ApiError } from '@/services/apiClient'
import { useSettingsStore } from '@/store/settingsStore'
import { Separator } from '@/components/ui/separator'
import { DomainSettingsSection } from '@/features/settings/components/DomainSettingsSection'

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const loadFull = useSettingsStore((s) => s.loadFull)
  const setSettings = useSettingsStore((s) => s.setSettings)

  const [storeName, setStoreName] = React.useState('')
  const [darkMode, setDarkMode] = React.useState(false)
  const [scanbotLicenseKey, setScanbotLicenseKey] = React.useState('')
  const [scanbotKeyMode, setScanbotKeyMode] = React.useState<'key' | 'format'>('key')
  const [scanbotKeySnippet, setScanbotKeySnippet] = React.useState('')
  const [telegramEnabled, setTelegramEnabled] = React.useState(false)
  const [backupEnabled, setBackupEnabled] = React.useState(false)
  const [backupTime, setBackupTime] = React.useState('02:00')

  const [currentPin, setCurrentPin] = React.useState('')
  const [newPin, setNewPin] = React.useState('')
  const [confirmPin, setConfirmPin] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [savingPin, setSavingPin] = React.useState(false)
  const [savingOps, setSavingOps] = React.useState(false)
  const [backupNowLoading, setBackupNowLoading] = React.useState(false)

  React.useEffect(() => {
    void loadFull()
  }, [loadFull])

  React.useEffect(() => {
    if (!settings) return
    setStoreName(settings.storeName)
    setDarkMode(settings.darkMode)
    setScanbotLicenseKey(settings.scanbotLicenseKey ?? '')
    setScanbotKeySnippet('')
    setTelegramEnabled(settings.telegramEnabled)
    setBackupEnabled(settings.backupEnabled)
    setBackupTime(settings.backupTime)
  }, [settings])

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const persistGeneral = async (): Promise<void> => {
    setSaving(true)
    try {
      const next = await updateSettings({
        storeName,
        darkMode,
      })
      setSettings(next)
      toast.success('Đã lưu cài đặt')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const persistOps = async (): Promise<void> => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(backupTime)) {
      toast.error('Giờ backup phải theo định dạng HH:mm (ví dụ 02:00)')
      return
    }
    setSavingOps(true)
    try {
      const rawScanbot = scanbotKeyMode === 'format' ? scanbotKeySnippet : scanbotLicenseKey
      const next = await updateSettings({
        telegramEnabled,
        backupEnabled,
        backupTime,
        // FE gửi raw; BE sẽ normalize/parse snippet để lưu DB
        scanbotLicenseKey: rawScanbot,
      })
      setSettings(next)
      toast.success('Đã lưu cài đặt vận hành')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Lưu thất bại')
    } finally {
      setSavingOps(false)
    }
  }

  const persistPin = async (): Promise<void> => {
    if (newPin.length !== 4) {
      toast.error('Mã PIN mới cần đúng 4 chữ số')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('Nhập lại PIN mới không khớp')
      return
    }
    if (currentPin.length !== 4) {
      toast.error('Nhập đúng 4 số mã PIN hiện tại')
      return
    }
    setSavingPin(true)
    try {
      const next = await updateSettings({
        currentPin,
        newPin,
      })
      setSettings(next)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      toast.success('Đã đổi PIN')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Đổi PIN thất bại')
    } finally {
      setSavingPin(false)
    }
  }

  const runBackupNow = async (): Promise<void> => {
    setBackupNowLoading(true)
    try {
      const res = await backupSqlNow()
      if (res.ok) {
        toast.success(res.message || 'Backup thành công')
      } else {
        toast.error(res.message || 'Backup thất bại')
      }
      await loadFull()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Backup thất bại')
    } finally {
      setBackupNowLoading(false)
    }
  }

  const openScanbotTrial = React.useCallback(() => {
    window.open('https://docs.scanbot.io/trial/', '_blank', 'noopener,noreferrer')
  }, [])


  if (!settings) {
    return (
      <div className="grid place-items-center py-16 text-sm text-muted-foreground">Đang tải cài đặt…</div>
    )
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="flex items-center gap-2">
          <Cog className="size-4 text-muted-foreground" />
          <div className="text-lg font-semibold leading-tight sm:text-xl">Cài đặt</div>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Đồng bộ với máy chủ. Mỗi lần mở ứng dụng sẽ tải lại cài đặt.
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Khu cài đặt chung</CardTitle>
          <div className="text-xs text-muted-foreground">
            Các lựa chọn hiển thị và tính năng trong quá trình bán hàng.
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void persistGeneral()
            }}
          >
            <div className="grid gap-3 xl:grid-cols-2">
              <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Store className="size-4 text-muted-foreground" />
                Cửa hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="storeName">Tên cửa hàng</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="VD: Toy Shop"
                />
              </div>
            </CardContent>
          </Card>

              <Card>
            <CardHeader className="pb-2">
              <CardTitle>Giao diện</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Dark mode</div>
                  <div className="text-xs text-muted-foreground">Bật giao diện tối</div>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </CardContent>
          </Card>
            </div>

            <div className="flex justify-end items-center">
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu cài đặt chung'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Khu cấu hình</CardTitle>
          <div className="text-xs text-muted-foreground">
            Tuỳ chọn vận hành hệ thống (thông báo, backup). Có hiệu lực gần như ngay lập tức.
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void persistOps()
            }}
          >
            <div className="grid gap-3 xl:grid-cols-2">
              <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-muted-foreground" />
                Thông báo
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Telegram</div>
                  <div className="text-xs text-muted-foreground">
                    Gửi thông báo: lỗi server, hoá đơn, thanh toán, khóa PIN, backup…
                  </div>
                </div>
                <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
              </div>
            </CardContent>
          </Card>

              <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                Backup SQL
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Bật backup</div>
                  <div className="text-xs text-muted-foreground">Tự động dump MySQL 1 lần/ngày</div>
                </div>
                <Switch checked={backupEnabled} onCheckedChange={setBackupEnabled} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="backupTime">Giờ backup (HH:mm)</Label>
                <Input
                  id="backupTime"
                  type="time"
                  value={backupTime}
                  onChange={(e) => setBackupTime(e.target.value)}
                  disabled={!backupEnabled}
                />
                <div className="text-xs text-muted-foreground">
                  Lần backup gần nhất:{' '}
                  <span className="font-medium text-foreground">
                    {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : 'Chưa có'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={backupNowLoading}
                  onClick={() => void runBackupNow()}
                >
                  {backupNowLoading ? 'Đang backup…' : 'Backup ngay'}
                </Button>
              </div>
            </CardContent>
          </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Scanbot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScanbotKeyMode('key')}
                    className={
                      scanbotKeyMode === 'key'
                        ? 'rounded-lg border bg-foreground px-3 py-1.5 text-xs font-medium text-background'
                        : 'rounded-lg border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted/60'
                    }
                  >
                    Nhập key (đã format)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanbotKeyMode('format')}
                    className={
                      scanbotKeyMode === 'format'
                        ? 'rounded-lg border bg-foreground px-3 py-1.5 text-xs font-medium text-background'
                        : 'rounded-lg border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted/60'
                    }
                  >
                    Dán snippet (LICENSE_KEY = "..." + ...)
                  </button>
                </div>

                {scanbotKeyMode === 'key' ? (
                  <>
                    <Label htmlFor="scanbotLicenseKey">SCANBOT_LICENSE_KEY</Label>
                    <Input
                      id="scanbotLicenseKey"
                      type="password"
                      autoComplete="off"
                      value={scanbotLicenseKey}
                      onChange={(e) => setScanbotLicenseKey(e.target.value)}
                      placeholder="Dán license key tại đây"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="scanbotKeySnippet">Snippet</Label>
                    <textarea
                      id="scanbotKeySnippet"
                      value={scanbotKeySnippet}
                      onChange={(e) => setScanbotKeySnippet(e.target.value)}
                      placeholder={'LICENSE_KEY = "..." + "\\n...";'}
                      className="min-h-28 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      spellCheck={false}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-end">
              <Button type="button" variant="secondary" onClick={openScanbotTrial}>
                Get license
              </Button>
              <Button type="submit" disabled={savingOps}>
                {savingOps ? 'Đang lưu…' : 'Lưu cấu hình'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <DomainSettingsSection
        settings={settings}
        onSettingsSaved={(next) => {
          setSettings(next)
        }}
      />

      <Separator />

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Khu bảo mật</CardTitle>
          <div className="text-xs text-muted-foreground">Quản lý mã PIN mở khoá POS.</div>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void persistPin()
            }}
          >
            <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              Mã PIN mở khoá
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="currentPin">PIN hiện tại</Label>
              <Input
                id="currentPin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPin">PIN mới (4 số)</Label>
              <Input
                id="newPin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPin">Nhập lại PIN mới</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
            </div>
            <div className="xl:col-span-3 flex justify-end">
              <Button type="submit" disabled={savingPin}>
                {savingPin ? 'Đang lưu…' : 'Đổi mã PIN'}
              </Button>
            </div>
          </CardContent>
            </Card>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
