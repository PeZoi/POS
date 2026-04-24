import * as React from 'react'
import { Cloud, Globe, Pencil, Plus, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/services/apiClient'
import { createDnsRecord, fetchDnsRecords, updateDnsRecord } from '@/services/domainService'
import { updateSettings } from '@/services/settingsService'
import type { DnsRecord } from '@/types/domain.type'
import type { Setting } from '@/types/settings.type'

type Props = {
  settings: Setting
  onSettingsSaved: (next: Setting) => void
}

export function DomainSettingsSection({ settings, onSettingsSaved }: Props) {
  const [cloudflareApiToken, setCloudflareApiToken] = React.useState('')
  const [cloudflareZoneId, setCloudflareZoneId] = React.useState('')
  const [rootDomain, setRootDomain] = React.useState('')
  const [activeDomain, setActiveDomain] = React.useState('')

  const [saving, setSaving] = React.useState(false)
  const [loadingRecords, setLoadingRecords] = React.useState(false)
  const [records, setRecords] = React.useState<DnsRecord[]>([])
  const [recordsMeta, setRecordsMeta] = React.useState<{ total: number; limit: number; offset: number } | null>(null)
  const didAutoLoadRef = React.useRef(false)

  const [editing, setEditing] = React.useState<DnsRecord | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editType, setEditType] = React.useState('A')
  const [editName, setEditName] = React.useState('')
  const [editContent, setEditContent] = React.useState('')
  const [editTtl, setEditTtl] = React.useState(60)
  const [editProxied, setEditProxied] = React.useState(true)
  const [editComment, setEditComment] = React.useState('')
  const [updatingRecord, setUpdatingRecord] = React.useState(false)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [createType, setCreateType] = React.useState('A')
  const [createName, setCreateName] = React.useState('')
  const [createContent, setCreateContent] = React.useState('')
  const [createTtl, setCreateTtl] = React.useState(60)
  const [createProxied, setCreateProxied] = React.useState(true)
  const [creatingRecord, setCreatingRecord] = React.useState(false)

  React.useEffect(() => {
    setCloudflareApiToken(settings.cloudflareApiToken ?? '')
    setCloudflareZoneId(settings.cloudflareZoneId ?? '')
    setRootDomain(settings.rootDomain ?? '')
    setActiveDomain(settings.activeDomain ?? '')
  }, [settings])

  React.useEffect(() => {
    // Auto tải trước khi user bấm nút, chỉ 1 lần mỗi lần mount
    if (didAutoLoadRef.current) return
    const hasCf = Boolean(settings.cloudflareZoneId?.trim() && settings.cloudflareApiToken?.trim())
    if (!hasCf) return
    didAutoLoadRef.current = true
    void refresh()
  }, [settings.cloudflareZoneId, settings.cloudflareApiToken])

  React.useEffect(() => {
    if (!editing) return
    setEditType(editing.type || 'A')
    setEditName((editing.nameUnicode || editing.name || '').trim())
    setEditContent((editing.content || '').trim())
    setEditTtl(Number.isFinite(editing.ttl) ? editing.ttl : 60)
    setEditProxied(Boolean(editing.proxied))
    setEditComment((editing.comment || '').trim())
  }, [editing])

  const hasCfConfig = Boolean((cloudflareZoneId || settings.cloudflareZoneId)?.trim() && (cloudflareApiToken || settings.cloudflareApiToken)?.trim())
  const showActiveDomainHint = Boolean((rootDomain || settings.rootDomain)?.trim())

  const persist = async (): Promise<void> => {
    setSaving(true)
    try {
      const prevActive = (settings.activeDomain ?? '').trim()
      const next = await updateSettings({
        cloudflareApiToken,
        cloudflareZoneId,
        rootDomain,
        activeDomain,
      })
      onSettingsSaved(next)
      toast.success('Đã lưu cấu hình domain')
      didAutoLoadRef.current = false
      void refresh()

      const nextRoot = (next.rootDomain ?? '').trim()
      const nextActive = (next.activeDomain ?? '').trim()
      const changedActive = prevActive !== nextActive

      // Bắt trình duyệt tạo request mới để nhận redirect mới ngay (tránh cache redirect/DNS/socket).
      if (changedActive && nextRoot) {
        window.location.replace(`https://${nextRoot}/?cb=${Date.now()}`)
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const refresh = async (): Promise<void> => {
    setLoadingRecords(true)
    try {
      const res = await fetchDnsRecords()
      setRecords(res.data ?? [])
      setRecordsMeta({ total: res.total, limit: res.limit, offset: res.offset })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Không tải được DNS records')
    } finally {
      setLoadingRecords(false)
    }
  }

  const openEdit = (r: DnsRecord) => {
    setEditing(r)
    setEditOpen(true)
  }

  const openCreate = () => {
    setCreateType('A')
    setCreateName('')
    setCreateContent('')
    setCreateTtl(60)
    setCreateProxied(true)
    setCreateOpen(true)
  }

  const applyUpdate = async () => {
    if (!editing) return
    setUpdatingRecord(true)
    try {
      const msg = await updateDnsRecord({
        id: editing.id,
        name: editName,
        type: editType,
        content: editContent,
        ttl: editTtl,
        proxied: editProxied,
      })
      toast.success(msg || 'Cập nhật bản ghi thành công')
      setEditOpen(false)
      setEditing(null)
      await refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Cập nhật bản ghi thất bại')
    } finally {
      setUpdatingRecord(false)
    }
  }

  const applyCreate = async () => {
    if (!settings.cloudflareZoneId?.trim() && !cloudflareZoneId.trim()) {
      toast.error('Thiếu Cloudflare Zone ID')
      return
    }
    if (!createName.trim()) {
      toast.error('Tên bản ghi là bắt buộc')
      return
    }
    if (!createContent.trim()) {
      toast.error('Content/IP là bắt buộc')
      return
    }
    setCreatingRecord(true)
    try {
      const msg = await createDnsRecord({
        name: createName.trim(),
        type: createType,
        content: createContent.trim(),
        ttl: createTtl,
        proxied: createProxied,
      })
      toast.success(msg || 'Tạo bản ghi thành công')
      setCreateOpen(false)
      await refresh()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Tạo bản ghi thất bại')
    } finally {
      setCreatingRecord(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5 text-muted-foreground" />
              <span className="truncate">Cấu hình Domain</span>
            </CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              Quản lý DNS qua Cloudflare (frontend gọi backend làm proxy).
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={hasCfConfig ? 'success' : 'warning'} className="gap-1">
              <Cloud className="size-3" />
              {hasCfConfig ? 'Cloudflare: Sẵn sàng' : 'Cloudflare: Chưa cấu hình'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <form
          className="grid gap-4 rounded-xl border bg-muted/10 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            void persist()
          }}
        >
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="xl:col-span-2 grid gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium">Cloudflare DNS</div>
                <Badge variant="secondary">Khuyến nghị</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Dùng API Token với quyền <span className="font-medium text-foreground">Zone.DNS:Edit</span>.
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cloudflareZoneId">Cloudflare Zone ID</Label>
              <Input
                id="cloudflareZoneId"
                value={cloudflareZoneId}
                onChange={(e) => setCloudflareZoneId(e.target.value)}
                placeholder="023e105f4ecef8ad9ca31a8372d0c353"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cloudflareApiToken">Cloudflare API Token</Label>
              <Input
                id="cloudflareApiToken"
                type="password"
                autoComplete="off"
                value={cloudflareApiToken}
                onChange={(e) => setCloudflareApiToken(e.target.value)}
                placeholder="Dán API Token tại đây"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rootDomain">Root domain</Label>
              <Input
                id="rootDomain"
                value={rootDomain}
                onChange={(e) => setRootDomain(e.target.value)}
                placeholder="pos-toy.click"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="activeDomain">Active domain (root sẽ redirect sang)</Label>
              <Input
                id="activeDomain"
                value={activeDomain}
                onChange={(e) => setActiveDomain(e.target.value)}
                placeholder="vd: a1.pos-toy.click"
              />
              <div className="text-xs text-muted-foreground">
                {showActiveDomainHint ? (
                  <>
                    Khi user vào <span className="font-medium text-foreground">{rootDomain || 'root domain'}</span> sẽ tự đổi URL sang domain này.
                  </>
                ) : (
                  <>Nhập root domain để bật mô tả redirect.</>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" disabled={loadingRecords || !hasCfConfig} onClick={() => void refresh()}>
              <RefreshCw className="mr-2 size-4" />
              {loadingRecords ? 'Đang tải…' : 'Tải records'}
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? 'Đang lưu…' : 'Lưu cấu hình'}
            </Button>
          </div>
        </form>

        <div className="rounded-xl border">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">DNS records</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {recordsMeta ? `Tổng ${recordsMeta.total} • Limit ${recordsMeta.limit} • Offset ${recordsMeta.offset}` : '—'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={!hasCfConfig || loadingRecords} onClick={() => void refresh()}>
                <RefreshCw className="mr-2 size-4" />
                Làm mới
              </Button>
              <Button type="button" size="sm" disabled={!hasCfConfig} onClick={openCreate}>
                <Plus className="mr-2 size-4" />
                Tạo bản ghi
              </Button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[90px]">Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="text-right">TTL</TableHead>
                  <TableHead className="w-[120px]">Proxy</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right w-[86px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      <div className="mx-auto grid max-w-[420px] gap-2">
                        <div className="text-sm font-medium">Chưa có dữ liệu</div>
                        <div className="text-xs text-muted-foreground">
                          {hasCfConfig ? 'Bấm “Làm mới” để tải danh sách DNS records.' : 'Nhập Cloudflare Zone ID + API Token rồi bấm “Lưu cấu hình”.'}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nameUnicode || r.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[520px] truncate font-mono text-xs" title={r.content}>
                        {r.content}
                      </TableCell>
                      <TableCell className="text-right">{r.ttl}</TableCell>
                      <TableCell>
                        {r.proxied ? (
                          <Badge variant="success">Proxied</Badge>
                        ) : (
                          <Badge variant="muted">DNS only</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="icon-sm" variant="ghost" onClick={() => openEdit(r)} aria-label="Chỉnh sửa">
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Modal
          open={editOpen}
          onOpenChange={(o) => {
            setEditOpen(o)
            if (!o) setEditing(null)
          }}
          size="lg"
          title={editing ? `Chỉnh sửa bản ghi: ${editing.nameUnicode || editing.name}` : 'Chỉnh sửa bản ghi'}
          description={rootDomain?.trim() ? `Root: ${rootDomain}` : undefined}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditOpen(false)
                    setEditing(null)
                  }}
                  disabled={updatingRecord}
                >
                  Huỷ
                </Button>
                <Button type="button" onClick={() => void applyUpdate()} disabled={!editing || updatingRecord}>
                  {updatingRecord ? 'Đang cập nhật…' : 'Cập nhật bản ghi'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-3 xl:grid-cols-3">
              <div className="grid gap-2">
                <Label>Loại</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {['A', 'AAAA', 'CNAME', 'TXT', 'MX'].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dnsName">Tên *</Label>
                <Input
                  id="dnsName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="vd: www, ws, @"
                />
                <div className="text-xs text-muted-foreground">Dùng “@” cho root domain</div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dnsContent">Địa chỉ IP / Content *</Label>
                <Input
                  id="dnsContent"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="110.172.29.158"
                />
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <div className="grid gap-2">
                <Label>TTL</Label>
                <Select value={String(editTtl)} onValueChange={(v) => setEditTtl(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[
                        { v: 60, label: '1 phút' },
                        { v: 120, label: '2 phút' },
                        { v: 300, label: '5 phút' },
                        { v: 600, label: '10 phút' },
                        { v: 3600, label: '1 giờ' },
                      ].map((o) => (
                        <SelectItem key={o.v} value={String(o.v)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Thời gian sống — DNS resolver cache bản ghi này</div>
              </div>

              <div className="grid gap-2 xl:col-span-2">
                <Label>Proxy qua One Shield</Label>
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{editProxied ? 'Đã proxy' : 'Tắt proxy'}</div>
                    <div className="text-xs text-muted-foreground">Bật proxy để dùng lớp bảo vệ/định tuyến của One Shield</div>
                  </div>
                  <Switch checked={editProxied} onCheckedChange={setEditProxied} />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dnsComment">Bình luận (Tuỳ chọn)</Label>
              <textarea
                id="dnsComment"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Mô tả thêm cho bản ghi…"
                className="min-h-24 w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                spellCheck={false}
              />
            </div>
          </div>
        </Modal>

        <Modal
          open={createOpen}
          onOpenChange={setCreateOpen}
          size="lg"
          title="Tạo bản ghi DNS"
          description={rootDomain?.trim() ? `Root: ${rootDomain}` : undefined}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Tạo bản ghi qua backend proxy (POST).</div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" disabled={creatingRecord} onClick={() => setCreateOpen(false)}>
                  Huỷ
                </Button>
                <Button type="button" disabled={creatingRecord} onClick={() => void applyCreate()}>
                  {creatingRecord ? 'Đang tạo…' : 'Tạo bản ghi'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-3 xl:grid-cols-3">
              <div className="grid gap-2">
                <Label>Loại</Label>
                <Select value={createType} onValueChange={setCreateType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {['A', 'AAAA', 'CNAME', 'TXT', 'MX'].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dnsCreateName">Tên *</Label>
                <Input
                  id="dnsCreateName"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="vd: a1, www, @"
                />
                <div className="text-xs text-muted-foreground">Dùng “@” cho root domain</div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dnsCreateContent">Địa chỉ IP / Content *</Label>
                <Input
                  id="dnsCreateContent"
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  placeholder="110.172.29.158"
                />
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <div className="grid gap-2">
                <Label>TTL</Label>
                <Select value={String(createTtl)} onValueChange={(v) => setCreateTtl(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[
                        { v: 60, label: '1 phút' },
                        { v: 120, label: '2 phút' },
                        { v: 300, label: '5 phút' },
                        { v: 600, label: '10 phút' },
                        { v: 3600, label: '1 giờ' },
                      ].map((o) => (
                        <SelectItem key={o.v} value={String(o.v)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Thời gian sống — DNS resolver cache bản ghi này</div>
              </div>

              <div className="grid gap-2 xl:col-span-2">
                <Label>Proxy qua One Shield</Label>
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/10 px-3 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{createProxied ? 'Đã proxy' : 'Tắt proxy'}</div>
                    <div className="text-xs text-muted-foreground">Bật proxy để dùng lớp bảo vệ/định tuyến của One Shield</div>
                  </div>
                  <Switch checked={createProxied} onCheckedChange={setCreateProxied} />
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </CardContent>
    </Card>
  )
}

