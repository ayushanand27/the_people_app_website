export function normalizePhone(number) {
  if (!number) return ''
  const digits = String(number).replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  return digits
}

export function whatsappUrl(number, message = '') {
  const n = normalizePhone(number)
  if (!n) return null
  const full = n.length === 10 ? `91${n}` : n
  const q = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${full}${q}`
}

export function telUrl(number) {
  const n = normalizePhone(number)
  if (!n) return null
  return `tel:+91${n}`
}
