import * as React from 'react'
import { Cog, CreditCard, KeyRound, Printer, Store } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateSettings } from '@/services/settingsService'
import { ApiError } from '@/services/apiClient'
import { useSettingsStore } from '@/store/settingsStore'

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings)
  const loadFull = useSettingsStore((s) => s.loadFull)
  const setSettings = useSettingsStore((s) => s.setSettings)

  const [storeName, setStoreName] = React.useState('')
  const [enableQr, setEnableQr] = React.useState(true)
  const [enableCard, setEnableCard] = React.useState(false)
  const [enablePrint, setEnablePrint] = React.useState(false)
  const [darkMode, setDarkMode] = React.useState(false)

  const [currentPin, setCurrentPin] = React.useState('')
  const [newPin, setNewPin] = React.useState('')
  const [confirmPin, setConfirmPin] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [savingPin, setSavingPin] = React.useState(false)

  React.useEffect(() => {
    void loadFull()
  }, [loadFull])

  React.useEffect(() => {
    if (!settings) return
    setStoreName(settings.storeName)
    setEnableQr(settings.enableQr)
    setEnableCard(settings.enableCard)
    setEnablePrint(settings.enablePrint)
    setDarkMode(settings.darkMode)
  }, [settings])

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const persistGeneral = async () => {
    setSaving(true)
    try {
      const next = await updateSettings({
        storeName,
        enableQr,
        enableCard,
        enablePrint,
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

  const persistPin = async () => {
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

      <div className="grid gap-3 lg:grid-cols-2">
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
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              Thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">QR</div>
                <div className="text-xs text-muted-foreground">Bật thanh toán QR</div>
              </div>
              <Switch checked={enableQr} onCheckedChange={setEnableQr} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Thẻ</div>
                <div className="text-xs text-muted-foreground">Bật thanh toán thẻ</div>
              </div>
              <Switch checked={enableCard} onCheckedChange={setEnableCard} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Printer className="size-4 text-muted-foreground" />
              In hoá đơn
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Tự động in</div>
                <div className="text-xs text-muted-foreground">
                  In ngay sau khi thanh toán
                </div>
              </div>
              <Switch checked={enablePrint} onCheckedChange={setEnablePrint} />
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

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              Mã PIN mở khoá
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
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
            <div className="sm:col-span-3">
              <Button type="button" variant="secondary" disabled={savingPin} onClick={() => void persistPin()}>
                {savingPin ? 'Đang lưu…' : 'Đổi PIN'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={saving} onClick={() => void persistGeneral()}>
          {saving ? 'Đang lưu…' : 'Lưu cài đặt chung'}
        </Button>
        <div className="text-xs text-muted-foreground">
          Tên hiển thị: <span className="font-medium text-foreground">{storeName}</span>
        </div>
      </div>
    </div>
  )
}
