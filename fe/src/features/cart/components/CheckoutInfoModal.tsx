import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'

export type CheckoutPaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

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
            autoFocus
          />
        </div>

        <div className="grid gap-2 pt-2">
          <div className="text-sm font-medium text-foreground">Trạng thái thanh toán</div>
          <select
            className={cn(
              'h-11 w-full rounded-xl border border-input bg-transparent px-3 text-base shadow-xs',
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
            value={value.paymentState}
            onChange={(e) => {
              const v = e.target.value as CheckoutPaymentState
              onChange({
                ...value,
                paymentState: v,
                paidAmountRaw: v === 'PARTIALLY_PAID' ? value.paidAmountRaw : '',
              })
            }}
          >
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Thanh toán 1 phần</option>
            <option value="PAID">Thanh toán</option>
          </select>
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

