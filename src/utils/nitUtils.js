const NIT_MULTIPLIERS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47]

const normalizeNit = (value) => String(value || '').replace(/\D/g, '')

export const calculateNitDigit = (nit) => {
  const normalized = normalizeNit(nit)
  if (!normalized) return null

  const digits = normalized.split('').map(Number).reverse()

  let sum = 0
  for (let i = 0; i < digits.length && i < NIT_MULTIPLIERS.length; i += 1) {
    sum += digits[i] * NIT_MULTIPLIERS[i]
  }

  const remainder = sum % 11
  return remainder > 1 ? 11 - remainder : remainder
}

export const formatNit = (nit, digit) => {
  const normalized = normalizeNit(nit)
  if (!normalized) return ''

  const body = normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (digit === null || digit === undefined || Number.isNaN(Number(digit))) {
    return body
  }

  return `${body}-${digit}`
}
