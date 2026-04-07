/** Chỉ giữ chữ số (phù hợp nhập giá VND nguyên). */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * Bỏ số 0 đầu chuỗi chữ số (ví dụ 0500000 → 500000).
 * Chuỗi chỉ gồm 0 → một chữ số '0'.
 */
export function stripLeadingZeros(digits: string): string {
  if (!digits) return ''
  const stripped = digits.replace(/^0+/, '')
  if (stripped === '') return '0'
  return stripped
}

/** Chuỗi chữ số → hiển thị dạng 1,234,567 (đã bỏ 0 đầu). */
export function formatThousandsComma(digits: string): string {
  if (!digits) return ''
  const n = stripLeadingZeros(digits)
  if (!n) return ''
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
