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
    `💳 Código de reserva: ${referenceCode}`,
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
