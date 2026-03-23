import { formatReferenceDisplay } from './referenceUtils'

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const longDateFormatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const normalizeDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export const formatCop = (value) => currencyFormatter.format(Number(value || 0))

export const buildQuotePublicUrl = (token) => {
  if (!token) return ''
  const base = (import.meta.env?.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  return `${base}/functions/v1/public-quote?token=${token}`
}

export const formatDateLongEs = (value) => {
  const date = normalizeDate(value)
  if (!date) return '-'
  return longDateFormatter.format(date)
}

export const copyAsWhatsApp = async (reservation, profile) => {
  const guestName = reservation?.guestName || reservation?.guest_name || 'huesped'
  const businessName = profile?.commercial_name || profile?.legal_name || 'nuestro alojamiento'
  const contactPhone = profile?.phone || ''
  const nights = Number(reservation?.nights || 0)
  const totalGuests = Number(reservation?.adults || 0) + Number(reservation?.children || 0)
  const unitName = reservation?.unitName || reservation?.unitLabel || 'Unidad'
  const referenceCode = reservation?.reference_code || reservation?.referenceCode || '-'
  const referenceDisplay = formatReferenceDisplay(referenceCode, reservation?.guestName || reservation?.guest_name)
  const total = Number(reservation?.total_amount || reservation?.total || 0)
  const paid = Number(reservation?.paid_amount || reservation?.paid || 0)
  const balance = Math.max(0, total - paid)

  const lines = [
    `Hola ${guestName}! 👋`,
    '',
    `Te compartimos el resumen de tu reserva en ${businessName}.`,
    '',
    `🗓 Check-in: ${formatDateLongEs(reservation?.check_in)}`,
    `🗓 Check-out: ${formatDateLongEs(reservation?.check_out)}`,
    `🌙 ${nights} noches · ${totalGuests} personas`,
    `🏠 ${unitName}`,
    '',
    `💳 Código de reserva: ${referenceDisplay}`,
    '',
    `💰 Total: ${formatCop(total)}`,
    `✅ Pagado: ${formatCop(paid)}`,
  ]

  if (balance > 0) {
    lines.push(`⏳ Saldo pendiente: ${formatCop(balance)}`)
  }

  const firstConditionLine = String(reservation?.voucher_conditions || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)

  if (firstConditionLine) {
    lines.push('')
    lines.push(`📋 ${firstConditionLine}`)
  }

  lines.push('')
  lines.push('Cualquier duda estamos a tu disposición.')
  lines.push(`${businessName} · ${contactPhone || '-'}`)

  const message = lines.join('\n')
  await navigator.clipboard.writeText(message)
  return message
}

export const copyQuotationAsWhatsApp = async (inquiry, profile, quoteUrl = '') => {
  const guestName = inquiry?.guest_name || 'huesped'
  const businessName = profile?.commercial_name || profile?.legal_name || 'nuestro alojamiento'
  const contactPhone = profile?.phone || '-'
  const checkIn = inquiry?.check_in
  const checkOut = inquiry?.check_out
  const nights = Number(inquiry?.nights || 0)
  const adults = Number(inquiry?.adults || 0)
  const children = Number(inquiry?.children || 0)
  const totalGuests = adults + children
  const unitsLabel = String(inquiry?.units_label || '').trim()
  const referenceCode = inquiry?.reference_code || inquiry?.quotation_number || '-'
  const referenceDisplay = formatReferenceDisplay(referenceCode, inquiry?.guest_name)
  const pricePerNight = Number(inquiry?.price_per_night || 0)
  const discountPercentage = Number(inquiry?.discount_percentage || 0)
  const subtotal = pricePerNight * Math.max(nights, 0)
  const discountAmount = subtotal * discountPercentage / 100
  const total = Math.max(subtotal - discountAmount, 0)

  const longDateWithoutWeekday = (value) => {
    const date = normalizeDate(value)
    if (!date) return '-'
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  }

  const lines = [
    `Hola ${guestName}! 👋`,
    '',
    `Te compartimos tu cotización de ${businessName}.`,
  ]

  if (checkIn && checkOut && nights > 0) {
    lines.push('')
    lines.push(`🗓 Check-in: ${formatDateLongEs(checkIn)}`)
    lines.push(`🗓 Check-out: ${formatDateLongEs(checkOut)}`)
    lines.push(`🌙 ${nights} noches · ${totalGuests} personas`)
  }

  if (unitsLabel) {
    lines.push(`🏠 ${unitsLabel}`)
  }

  lines.push('')
  lines.push(`💳 Código de referencia: ${referenceDisplay}`)

  if (pricePerNight > 0 && nights > 0) {
    lines.push('')
    lines.push(`💰 Precio por noche: ${formatCop(pricePerNight)}`)
    if (discountPercentage > 0) {
      lines.push(`🎁 Descuento (${discountPercentage}%): -${formatCop(discountAmount)}`)
    }
    lines.push(`💵 Total: ${formatCop(total)}`)
  }

  if (inquiry?.quote_expires_at) {
    lines.push('')
    lines.push(`⏰ Válida hasta: ${longDateWithoutWeekday(inquiry.quote_expires_at)}`)
  }

  if (quoteUrl) {
    lines.push('')
    lines.push(`🔗 Ver cotización: ${quoteUrl}`)
  }

  lines.push('')
  lines.push('Para confirmar escríbenos.')
  lines.push(`${businessName} · ${contactPhone}`)

  const message = lines.join('\n')
  await navigator.clipboard.writeText(message)
  return message
}
