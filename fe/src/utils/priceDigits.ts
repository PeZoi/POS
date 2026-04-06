/** Chỉ giữ chữ số (phù hợp nhập giá VND nguyên). */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}

/** Chuỗi chữ số → hiển thị dạng 1,234,567 */
export function formatThousandsComma(digits: string): string {
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
