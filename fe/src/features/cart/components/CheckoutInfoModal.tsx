import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'
import * as React from 'react'

export type CheckoutPaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

const PAYMENT_OPTIONS: {
  value: CheckoutPaymentState
  label: string
  description: string
  swatch: string
  active: string
}[] = [
  {
    value: 'UNPAID',
    label: 'Chưa thanh toán',
    description: 'Tạo hoá đơn ở trạng thái chờ thanh toán.',
    swatch: 'bg-sky-500 dark:bg-sky-400',
    active: 'border-sky-500/60 bg-sky-500/10 dark:border-sky-400/60 dark:bg-sky-400/10',
  },
  {
    value: 'PARTIALLY_PAID',
    label: 'Thanh toán 1 phần',
    description: 'Nhập số tiền đã thanh toán (phần còn lại sẽ được ghi nợ).',
    swatch: 'bg-amber-500 dark:bg-amber-400',
    active:
      'border-amber-500/60 bg-amber-500/10 dark:border-amber-400/60 dark:bg-amber-400/10',
  },
  {
    value: 'PAID',
    label: 'Thanh toán',
    description: 'Xác nhận hoá đơn đã được thanh toán đầy đủ.',
    swatch: 'bg-emerald-600 dark:bg-emerald-500',
    active:
      'border-emerald-600/60 bg-emerald-600/10 dark:border-emerald-500/60 dark:bg-emerald-500/10',
  },
]

export type CheckoutInfoValue = {
  customerName: string
  paymentState: CheckoutPaymentState
  paidAmountRaw: string
}

export type CheckoutInfoModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving?: boolean
  total: number
  value: CheckoutInfoValue
  onChange: (next: CheckoutInfoValue) => void
  onSubmit: () => void | Promise<void>
}

export function CheckoutInfoModal({
  open,
  onOpenChange,
  saving = false,
  total,
  value,
  onChange,
  onSubmit,
}: CheckoutInfoModalProps) {
  const paidInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    if (value.paymentState !== 'PARTIALLY_PAID') return
    const id = window.setTimeout(() => {
      paidInputRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }, 50)
    return () => window.clearTimeout(id)
  }, [open, value.paymentState])

  const disableSubmit =
    saving ||
    (value.paymentState === 'PARTIALLY_PAID' && digitsOnly(value.paidAmountRaw) === '')

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Thông tin hoá đơn"
      description="Nhập tên khách hàng (tuỳ chọn) và trạng thái thanh toán."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl px-5 text-base sm:px-6"
            disabled={saving}
          >
            Huỷ
          </Button>
          <Button
            onClick={() => void onSubmit()}
            className="h-11 rounded-xl px-5 text-base sm:px-6"
            disabled={disableSubmit}
          >
            Xác nhận
          </Button>
        </div>
      }
      size="sm"
    >
      <div className="grid gap-2">
        <div className="grid gap-2">
          <div className="text-sm font-medium text-foreground">Tên khách hàng (tuỳ chọn)</div>
          <Input
            value={value.customerName}
            onChange={(e) => onChange({ ...value, customerName: e.target.value })}
            placeholder="VD: Nguyễn Văn A"
            className="h-11 rounded-xl"
          />
        </div>

        <div className="grid gap-2 pt-2">
          <div className="text-sm font-medium text-foreground">Trạng thái thanh toán</div>
          <div className="grid gap-2" role="radiogroup" aria-label="Trạng thái thanh toán">
            {PAYMENT_OPTIONS.map(({ value: state, label: optLabel, description, swatch, active }) => {
              const selected = value.paymentState === state
              return (
                <button
                  key={state}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    'active:scale-[0.99]',
                    selected
                      ? cn('text-foreground shadow-xs', active)
                      : 'border-input bg-transparent text-foreground shadow-xs',
                  )}
                  onClick={() =>
                    onChange({
                      ...value,
                      paymentState: state,
                      paidAmountRaw: state === 'PARTIALLY_PAID' ? value.paidAmountRaw : '',
                    })
                  }
                >
                  <div className="flex items-start gap-3">
                    <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', swatch)} aria-hidden />
                    <div className="min-w-0">
                      <div className="text-base font-semibold leading-5">{optLabel}</div>
                      <div className="mt-1 text-sm text-muted-foreground leading-5">{description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {value.paymentState === 'PARTIALLY_PAID' && (
          <div className="grid gap-2 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-foreground">Số tiền đã thanh toán</div>
              <div className="text-xs text-muted-foreground tabular-nums">
                Tổng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}
              </div>
            </div>
            <Input
              ref={paidInputRef}
              value={
                value.paidAmountRaw === ''
                  ? ''
                  : formatThousandsComma(digitsOnly(value.paidAmountRaw))
              }
              onChange={(e) =>
                onChange({
                  ...value,
                  paidAmountRaw: stripLeadingZeros(digitsOnly(e.target.value)),
                })
              }
              inputMode="numeric"
              placeholder="VD: 50000"
              className="h-11 rounded-xl tabular-nums"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

