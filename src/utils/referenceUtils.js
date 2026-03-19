const ALLOWED_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

const toBase36FromUuid = (accountId) => {
  if (typeof accountId !== 'string') return ''

  const normalized = accountId.replace(/-/g, '').toLowerCase()
  if (!/^[0-9a-f]{32}$/.test(normalized)) return ''

  let value = 0n
  for (const char of normalized) {
    value = value * 16n + BigInt(parseInt(char, 16))
  }

  if (value === 0n) return '0'

  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let encoded = ''
  while (value > 0n) {
    const remainder = Number(value % 36n)
    encoded = chars[remainder] + encoded
    value /= 36n
  }

  return encoded
}

export const generateAccountPrefix = (accountId) => {
  const base36 = toBase36FromUuid(accountId)
  const filtered = base36.replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/gi, '').toUpperCase()
  return filtered.padEnd(4, '2').slice(0, 4)
}

export const generateReferenceCode = (prefix) => {
  const normalizedPrefix = String(prefix || '')
    .toUpperCase()
    .replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '')
    .slice(0, 4)
    .padEnd(4, '2')

  let suffix = ''
  for (let i = 0; i < 5; i += 1) {
    const index = Math.floor(Math.random() * ALLOWED_ALPHABET.length)
    suffix += ALLOWED_ALPHABET[index]
  }

  return `${normalizedPrefix}-${suffix}`
}

export { ALLOWED_ALPHABET }
