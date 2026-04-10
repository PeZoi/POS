import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import type { CreateProductInput } from '@/types/pos'
import { digitsOnly, formatThousandsComma, stripLeadingZeros } from '@/utils/priceDigits'

type QuickCreateProductModalProps = {
  open: boolean
  /** Có sẵn từ quét; null = thêm thủ công — không có barcode, hệ thống tạo mã nội bộ. */
  barcode: string | null
  /** Prefill tên sản phẩm khi user vừa search nhưng không có kết quả. */
  initialName?: string | null
  initialError: string | null
  onOpenChange: (open: boolean) => void
  onCreateProduct: (input: CreateProductInput) => Promise<void>
}

export function QuickCreateProductModal({
  open,
  barcode,
  initialName,
  initialError,
  onOpenChange,
  onCreateProduct,
}: QuickCreateProductModalProps) {
  const [draftName, setDraftName] = React.useState('')
  const [draftPriceRaw, setDraftPriceRaw] = React.useState('')
  const [error, setError] = React.useState<string | null>(initialError)
  const priceInputRef = React.useRef<HTMLInputElement | null>(null)

  const vndFormatter = React.useMemo(
    () => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }),
    [],
  )

  const formatVnd = React.useCallback((amount: number) => vndFormatter.format(amount), [
    vndFormatter,
  ])

  const parsedPrice = React.useMemo(() => {
    const digits = stripLeadingZeros(digitsOnly(draftPriceRaw))
    if (digits === '' || digits === '0') return 0
    const n = Number(digits)
    return Number.isFinite(n) ? n : 0
  }, [draftPriceRaw])

  function moveCaretToEndOnFocus(e: React.FocusEvent<HTMLInputElement>) {
    const el = e.currentTarget
    const len = el.value.length
    window.setTimeout(() => {
      try {
        el.setSelectionRange(len, len)
      } catch {
        // ignore
      }
    }, 0)
  }

  React.useEffect(() => {
    if (!open) return
    setDraftName(barcode ? '' : (initialName?.trim() ?? ''))
    setDraftPriceRaw('')
    setError(initialError)
  }, [open, initialError, barcode, initialName])

  React.useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      priceInputRef.current?.focus({ preventScroll: true })
    }, 50)
    return () => window.clearTimeout(t)
  }, [open])

  const confirmCreate = async () => {
    setError(null)

    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      setError('Vui lòng nhập giá > 0.')
      priceInputRef.current?.focus({ preventScroll: true })
      return
    }

    const resolvedBarcode =
      barcode != null && barcode.length > 0
        ? barcode
        : `MANUAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

    const name =
      draftName.trim().length > 0
        ? draftName.trim()
        : `SP ${resolvedBarcode.slice(-6)}`

    try {
      const payload: CreateProductInput = {
        name,
        barcode: resolvedBarcode,
        price: parsedPrice,
        status: 'ACTIVE',
        isAutoCreated: true,
      }
      await onCreateProduct(payload)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo sản phẩm.')
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={barcode ? 'Chưa có sản phẩm — tạo nhanh' : 'Thêm sản phẩm nhanh'}
      description={
        barcode ? (
          <span>
            Barcode: <span className="font-mono">{barcode}</span>
          </span>
        ) : (
          <>
          </>
        )
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Huỷ
          </Button>
          <Button size="lg" onClick={() => void confirmCreate()}>
            Xác nhận
          </Button>
        </div>
      }
      size="lg"
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="newName">Tên (tuỳ chọn)</Label>
          <Input
            id="newName"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Có thể để trống"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="newPrice">Giá (VND)</Label>
          <Input
            id="newPrice"
            ref={priceInputRef}
            autoFocus
            type="tel"
            value={draftPriceRaw === '' ? '' : formatThousandsComma(draftPriceRaw)}
            onChange={(e) => {
              setDraftPriceRaw(stripLeadingZeros(digitsOnly(e.target.value)))
            }}
            onBlur={(e) => {
              const digits = digitsOnly(e.currentTarget.value)
              if (digits === '') setDraftPriceRaw('0')
            }}
            onFocus={moveCaretToEndOnFocus}
            placeholder="Nhập số tiền"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 rounded-xl tabular-nums"
          />
          <div className="text-sm text-muted-foreground">
            {parsedPrice > 0 ? formatVnd(parsedPrice) : '—'}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

