import * as React from 'react'
import { Cog, CreditCard, Printer, Store } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function SettingsPage() {
  const [storeName, setStoreName] = React.useState('Cửa hàng gia đình')
  const [enableQr, setEnableQr] = React.useState(true)
  const [enableCard, setEnableCard] = React.useState(false)
  const [enablePrint, setEnablePrint] = React.useState(false)
  const [darkMode, setDarkMode] = React.useState(false)

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <div className="grid gap-4 md:gap-6">
      <div className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
        <div className="flex items-center gap-2">
          <Cog className="size-4 text-muted-foreground" />
          <div className="text-lg font-semibold leading-tight sm:text-xl">Cài đặt</div>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Demo UI (chưa lưu backend). Các tuỳ chọn sẽ dùng cho toàn app sau.
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
      </div>

      <div className="text-xs text-muted-foreground">
        Store preview: <span className="font-medium text-foreground">{storeName}</span>
      </div>
    </div>
  )
}

