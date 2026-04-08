import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'

function formatVnd(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export type OrderPaymentSubmitPayload = {
  amount: number
  note: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void

  title: string
  description?: string

  remainingAmount: number
  defaultAmount?: number

  submitting?: boolean
  onSubmit: (payload: OrderPaymentSubmitPayload) => void | Promise<void>
}

export function OrderPaymentDialog({
  open,
  onOpenChange,
  title,
  description,
  remainingAmount,
  defaultAmount,
  submitting = false,
  onSubmit,
}: Props) {
  const safeRemaining = Math.max(0, Math.floor(remainingAmount || 0))
  const safeDefault = Math.max(
    0,
    Math.min(safeRemaining, Math.floor(defaultAmount ?? safeRemaining)),
  )

  const [amountRaw, setAmountRaw] = React.useState('0')
  const [note, setNote] = React.useState<string>('')

  React.useEffect(() => {
    if (!open) return
    setAmountRaw(String(safeDefault))
    setNote('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const amount = React.useMemo(() => {
    const digits = stripLeadingZeros(digitsOnly(amountRaw))
    return digits.length ? Number(digits) : 0
  }, [amountRaw])

  const canSubmit = !submitting && amount >= 1 && amount <= safeRemaining

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Huỷ
          </Button>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => onSubmit({ amount, note: note.trim() ? note.trim() : null })}
            disabled={!canSubmit}
          >
            Ghi nhận thanh toán
          </Button>
        </div>
      }
      size="sm"
    >
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="orderPayAmount">Số tiền</Label>
          <Input
            id="orderPayAmount"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            spellCheck={false}
            className="tabular-nums"
            value={amountRaw === '' ? '' : formatThousandsComma(amountRaw)}
            onChange={(e) => {
              const next = stripLeadingZeros(digitsOnly(e.target.value))
              setAmountRaw(next === '0' ? '0' : next)
            }}
            onBlur={(e) => {
              const digits = digitsOnly(e.currentTarget.value)
              if (digits === '') setAmountRaw('0')
            }}
            placeholder="Nhập số tiền…"
          />

          <div className="text-xs text-muted-foreground">
            Còn lại: <span className="tabular-nums">{formatVnd(safeRemaining)}</span>
            {amount > safeRemaining && (
              <span className="ml-2 text-destructive">
                (Vượt quá {formatVnd(safeRemaining)})
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="orderPayNote">Ghi chú</Label>
          <Input
            id="orderPayNote"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Khách trả đợt 1…"
          />
        </div>
      </div>
    </Modal>
  )
}

