import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { Order, OrderStatus } from '@/types/pos'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatCreatedAt(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function formatDateOnly(d: Date) {
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function statusLabel(status: OrderStatus | null) {
  if (status === 'PAID') return 'Đã thanh toán'
  if (status === 'PARTIALLY_PAID') return 'Thanh toán 1 phần'
  if (status === 'CANCELLED') return 'Đã huỷ'
  return 'Chờ thanh toán'
}

function paidAmountLabel(paidAmount: number | null | undefined, totalAmount: number | null | undefined) {
  const paid = paidAmount == null ? null : Math.max(0, Math.floor(paidAmount))
  const total = totalAmount == null ? null : Math.max(0, Math.floor(totalAmount))
  if (paid == null) return '—'
  if (total != null && paid > total) return formatVnd(total)
  return formatVnd(paid)
}

export type OrderPrintDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  remainingAmount: number
}

export function OrderPrintDialog({ open, onOpenChange, order, remainingAmount }: OrderPrintDialogProps) {
  const [printedAt, setPrintedAt] = React.useState<Date>(() => new Date())

  React.useEffect(() => {
    if (!open) return
    setPrintedAt(new Date())
  }, [open])

  const cleanupPrintFrame = React.useCallback((frame: HTMLIFrameElement) => {
    try {
      frame.parentNode?.removeChild(frame)
    } catch {
      // ignore
    }
  }, [])

  const printInvoice = React.useCallback(() => {
    if (!order) {
      globalThis.alert?.('Chưa tải được dữ liệu hoá đơn để in.')
      return
    }

    const storeName = 'Cửa hàng đồ chơi Quế Hường'
    const storePhone = '0946535201'
    const storeAddress = '219/3 KP4, phường Tân Biên, Biên Hoà, Đồng Nai'
    const title = 'HOÁ ĐƠN BÁN HÀNG'

    const createdAtText = order.createdAt ? formatCreatedAt(order.createdAt) : '—'
    const printedAtText = formatCreatedAt(printedAt.toISOString())

    const customerName =
      order.customerName && order.customerName.trim() !== '' ? order.customerName.trim() : '—'

    const code = order.orderCode ?? String(order.id)
    const total = Math.max(0, Math.floor(order.totalAmount ?? 0))
    const paid = Math.max(0, Math.floor(order.paidAmount ?? 0))
    const remaining = Math.max(0, total - paid)

    const rowsHtml = (order.items ?? [])
      .map((it, idx) => {
        const productName = it.productName ? escapeHtml(it.productName) : '—'
        const qty = Math.max(0, Math.floor(it.quantity ?? 0))
        const unitPrice = Math.max(0, Math.floor(it.price ?? 0))
        const lineTotal = Math.max(0, Math.floor(it.subtotal ?? unitPrice * qty))
        return `
          <tr>
            <td class="c center">${idx + 1}</td>
            <td class="c break">${productName}</td>
            <td class="c right">${formatVnd(unitPrice)}</td>
            <td class="c right">${qty}</td>
            <td class="c right">${formatVnd(lineTotal)}</td>
          </tr>
        `
      })
      .join('')

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(code)}</title>
  <style>
    @page { size: A4; margin: 12mm 12mm 14mm; }
    html, body { height: 100%; }
    body {
      margin: 0;
      color: #111827;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue";
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrap { width: 100%; }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .store { font-size: 12px; line-height: 1.4; }
    .store .name { font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.2px; }
    .meta { text-align: right; font-size: 12px; line-height: 1.4; white-space: nowrap; }
    h1 { margin: 14px 0 8px; text-align: center; font-size: 18px; letter-spacing: 0.6px; }
    .sub { display: grid; grid-template-columns: 1fr auto; gap: 8px 12px; font-size: 12px; margin-bottom: 10px; }
    .sub .left { min-width: 0; }
    .sub .right { text-align: right; white-space: nowrap; }
    .line { height: 1px; background: #111827; opacity: 0.18; margin: 10px 0; }

    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    th, td { border: 1px solid #d1d5db; padding: 7px 8px; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 800; }
    .center { text-align: center; }
    .right { text-align: right; font-variant-numeric: tabular-nums; }
    .muted { color: #6b7280; }
    .nowrap { white-space: nowrap; }
    .break { word-break: break-word; overflow-wrap: anywhere; }
    tr { page-break-inside: avoid; }

    .totals {
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1fr 260px;
      gap: 12px;
      align-items: start;
      page-break-inside: avoid;
    }
    .totals .note { font-size: 12px; line-height: 1.4; }
    .totals .note .box {
      margin-top: 6px;
      border: none;
      min-height: 42px;
      padding: 8px;
      border-radius: 6px;
    }
    .totals table td { border: none; padding: 3px 0; }
    .totals .k { color: #6b7280; }
    .totals .v { text-align: right; font-variant-numeric: tabular-nums; }
    .totals .strong { font-weight: 900; font-size: 13px; }
    .totals .grand { padding-top: 6px; border-top: 1px solid #d1d5db; }

    .footer { margin-top: 16px; display: flex; justify-content: space-between; gap: 18px; font-size: 12px; page-break-inside: avoid; }
    .sign { width: 45%; text-align: center; }
    .sign .lbl { font-weight: 800; }
    .sign .hint { margin-top: 4px; color: #6b7280; font-size: 11px; }
    .sign .space { height: 66px; }
    .thanks { margin-top: 12px; text-align: center; font-size: 12px; color: #374151; }

    @media print {
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="store">
        <div class="name">${escapeHtml(storeName)}</div>
        <div>ĐT: ${escapeHtml(storePhone)}</div>
        <div>${escapeHtml(storeAddress)}</div>
      </div>
      <div class="meta">
        <div><span class="muted">Mã hoá đơn:</span> <b>${escapeHtml(code)}</b></div>
        <div><span class="muted">Trạng thái:</span> ${escapeHtml(statusLabel(order.status))}</div>
      </div>
    </div>

    <h1>${escapeHtml(title)}</h1>

    <div class="sub">
      <div class="left">
        <div class="break"><span class="muted">Khách hàng:</span> <b>${escapeHtml(customerName)}</b></div>
      </div>
      <div class="right">
        <div><span class="muted">Ngày tạo:</span> ${escapeHtml(createdAtText)}</div>
        <div><span class="muted">Ngày in:</span> ${escapeHtml(printedAtText)}</div>
      </div>
    </div>

    <div class="line"></div>

    <table>
      <thead>
        <tr>
          <th style="width: 44px" class="center">STT</th>
          <th>Sản phẩm</th>
          <th style="width: 120px" class="right">Đơn giá</th>
          <th style="width: 64px" class="right">SL</th>
          <th style="width: 130px" class="right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td class="c center" colspan="5">Chưa có sản phẩm.</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <div class="note">
        <div class="muted">Ghi chú</div>
        <div class="box">—</div>
      </div>
      <div>
        <table style="width:100%">
          <tr><td class="k">Tổng tiền</td><td class="v">${formatVnd(total)}</td></tr>
          <tr><td class="k">Đã thanh toán</td><td class="v">${paidAmountLabel(paid, total)}</td></tr>
          <tr><td class="k">Còn lại</td><td class="v">${formatVnd(remaining)}</td></tr>
          <tr><td class="k strong grand">Cần thanh toán</td><td class="v strong grand">${formatVnd(remaining)}</td></tr>
        </table>
      </div>
    </div>

    <div class="footer">
      <div class="sign">
        <div class="lbl">Khách hàng</div>
        <div class="hint">(Ký, ghi rõ họ tên)</div>
        <div class="space"></div>
      </div>
      <div class="sign">
        <div class="lbl">Người bán</div>
        <div class="hint">(Ký, ghi rõ họ tên)</div>
        <div class="space"></div>
      </div>
    </div>

    <div class="thanks">Cảm ơn Quý khách. Hẹn gặp lại!</div>
  </div>

  <script>
    // Leave printing to the parent (iframe contentWindow.print()).
  </script>
</body>
</html>`

    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.style.opacity = '0'
    document.body.appendChild(frame)

    const win = frame.contentWindow
    const doc = win?.document
    if (!win || !doc) {
      cleanupPrintFrame(frame)
      globalThis.alert?.('Không thể khởi tạo trình in. Vui lòng thử lại.')
      return
    }

    let cleaned = false
    const cleanupOnce = () => {
      if (cleaned) return
      cleaned = true
      cleanupPrintFrame(frame)
    }

    try {
      doc.open()
      doc.write(html)
      doc.close()
    } catch {
      cleanupOnce()
      globalThis.alert?.('Không thể tạo nội dung in. Vui lòng thử lại.')
      return
    }

    // Một số trình duyệt cần đợi layout xong mới in ổn định.
    const doPrint = () => {
      try {
        win.focus()
        win.print()
      } finally {
        window.setTimeout(cleanupOnce, 500)
      }
    }

    // Prefer onload; fallback timeout.
    frame.onload = () => doPrint()
    window.setTimeout(() => doPrint(), 250)
  }, [cleanupPrintFrame, order, printedAt])

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Xem trước hoá đơn"
      description="Kiểm tra nội dung trước khi in."
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          <Button size="lg" className="w-full sm:w-auto" onClick={printInvoice} disabled={!order}>
            In
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-[720px] rounded-2xl border bg-white p-4 text-black shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs leading-5">
            <div className="text-sm font-extrabold uppercase">Cửa hàng đồ chơi Quế Hường</div>
            <div>ĐT: 0946535201</div>
            <div>219/3 KP4, phường Tân Biên, Biên Hoà, Đồng Nai</div>
          </div>
          <div className="text-right text-xs leading-5">
            <div>
              <span className="text-muted-foreground">Mã hoá đơn:</span>{' '}
              <span className="font-bold">{order?.orderCode ?? (order ? String(order.id) : '—')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Trạng thái:</span>{' '}
              <span>{statusLabel(order?.status ?? null)}</span>
            </div>
          </div>
        </div>

        <div className="my-3 text-center text-base font-extrabold tracking-wide">HOÁ ĐƠN BÁN HÀNG</div>

        <div className="flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0">
            <div className="truncate">
              <span className="text-muted-foreground">Khách hàng:</span>{' '}
              <span className="font-semibold">
                {order?.customerName && order.customerName.trim() !== '' ? order.customerName : '—'}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div>
              <span className="text-muted-foreground">Ngày tạo:</span>{' '}
              <span className="tabular-nums">
                {order?.createdAt ? formatDateOnly(new Date(order.createdAt)) : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Ngày in:</span>{' '}
              <span className="tabular-nums">{formatDateOnly(printedAt)}</span>
            </div>
          </div>
        </div>

        <div className="my-3 h-px bg-zinc-200" />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50">
                <th className="border px-2 py-1 text-center">STT</th>
                <th className="border px-2 py-1 text-left">Sản phẩm</th>
                <th className="border px-2 py-1 text-right">Đơn giá</th>
                <th className="border px-2 py-1 text-right">SL</th>
                <th className="border px-2 py-1 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(order?.items ?? []).map((it, idx) => (
                <tr key={it.id ?? `${it.productId}-${idx}`}>
                  <td className="border px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border px-2 py-1">{it.productName}</td>
                  <td className="border px-2 py-1 text-right tabular-nums">{formatVnd(it.price)}</td>
                  <td className="border px-2 py-1 text-right tabular-nums">{it.quantity}</td>
                  <td className="border px-2 py-1 text-right tabular-nums">{formatVnd(it.subtotal)}</td>
                </tr>
              ))}

              {(order?.items ?? []).length === 0 && (
                <tr>
                  <td className="border px-2 py-6 text-center text-muted-foreground" colSpan={5}>
                    Chưa có sản phẩm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-1 text-xs">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Tổng tiền</div>
            <div className="font-semibold tabular-nums">{formatVnd(order?.totalAmount ?? 0)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Đã thanh toán</div>
            <div className="tabular-nums">{paidAmountLabel(order?.paidAmount, order?.totalAmount)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Còn lại</div>
            <div className="font-semibold tabular-nums">{formatVnd(remainingAmount)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
          <div className="text-center">
            <div className="font-semibold">Khách hàng</div>
            <div className="mt-1 text-muted-foreground">(Ký, ghi rõ họ tên)</div>
            <div className="mt-12">&nbsp;</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">Người bán</div>
            <div className="mt-1 text-muted-foreground">(Ký, ghi rõ họ tên)</div>
            <div className="mt-12">&nbsp;</div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

