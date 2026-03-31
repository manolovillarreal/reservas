import { formatReferenceDisplay } from './referenceUtils'
import { buildGlobalVariables, resolveTemplate } from './messageUtils'

export const DEFAULT_QUOTATION_TEMPLATE = `Hola {{nombre_huesped}}! 👋
Te compartimos tu cotización de {{nombre_alojamiento}}.

🗓 Check-in: {{fecha_checkin_larga}}
🗓 Check-out: {{fecha_checkout_larga}}
🌙 {{noches}} noches · {{personas}} personas

{{#unidades}}
🚪 {{nombre_unidad}}
{{descripcion_unidad}}
{{/unidades}}

{{#amenidades_comunes}}
{{amenidades_comunes}}
{{/amenidades_comunes}}

💳 Código: {{codigo_referencia}}
💰 Precio por noche: {{precio_noche}}

{{#descuento}}
🎁 Descuento ({{porcentaje_descuento}}%): -{{valor_descuento}}
{{/descuento}}

💵 Total: {{total}}

{{#fecha_vigencia}}
⏰ Válida hasta: {{fecha_vigencia}}
{{/fecha_vigencia}}

Para confirmar se realiza un anticipo del
{{porcentaje_anticipo}}%.
Escríbenos para cualquier duda.
{{nombre_alojamiento}} · {{telefono}}`

export const DEFAULT_VOUCHER_TEMPLATE = `Hola {{nombre_huesped}}! 👋
Te compartimos el resumen de tu reserva en {{nombre_alojamiento}}.

🗓 Check-in: {{fecha_checkin_larga}}
🗓 Check-out: {{fecha_checkout_larga}}
🌙 {{noches}} noches · {{personas}} personas

{{#unidades}}
🚪 {{nombre_unidad}}
{{descripcion_unidad}}
{{/unidades}}

💳 Código: {{codigo_referencia}}

{{#pago_completo}}
💵 Total: {{total}}
✅ Pagado: {{pagado}}
{{/pago_completo}}

{{#saldo_pendiente}}
💵 Total: {{total}}
💳 Pagado: {{pagado}}
⚠️ Saldo pendiente: {{saldo_pendiente}}
{{/saldo_pendiente}}

{{#sin_pagos}}
💵 Total: {{total}}
⏳ Pendiente: {{total}}
{{/sin_pagos}}

🕐 Check-in: {{hora_checkin}}
🕐 Check-out: {{hora_checkout}}

{{#condiciones}}
📋 {{condiciones}}
{{/condiciones}}

Cualquier duda estamos a tu disposición.
{{nombre_alojamiento}} · {{telefono}}`

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

export const buildQuotationWhatsAppMessage = (inquiry, profile, quoteUrl = '', options = {}) => {
  const systemTemplate = String(options?.systemTemplate || '').trim()
  const accountSettings = options?.accountSettings || {}

  const guestName = inquiry?.guest_name || 'huesped'
  const businessName = profile?.commercial_name || profile?.legal_name || 'nuestro alojamiento'
  const contactPhone = profile?.phone || '-'
  const checkIn = inquiry?.check_in
  const checkOut = inquiry?.check_out
  const nights = Number(inquiry?.nights || 0)
  const adults = Number(inquiry?.adults || 0)
  const children = Number(inquiry?.children || 0)
  const totalGuests = adults + children
  const units = Array.isArray(options?.units) ? options.units : []
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

  const validityDate = inquiry?.quote_expires_at ? longDateWithoutWeekday(inquiry.quote_expires_at) : '-'
  const selectedUnits = units.length
    ? units
    : (inquiry?.inquiry_units || []).map((row) => row?.units || {}).filter(Boolean)
  const unidades = selectedUnits
    .map((unit) => {
      const nombreUnidad = String(unit?.name || '').trim()
      const descripcionUnidad = String(unit?.description || '').trim()
      if (!nombreUnidad && !descripcionUnidad) return null
      return {
        nombre_unidad: nombreUnidad || 'Unidad',
        descripcion_unidad: descripcionUnidad,
      }
    })
    .filter(Boolean)

  const templateToUse = systemTemplate || DEFAULT_QUOTATION_TEMPLATE

  const templateVariables = {
    ...buildGlobalVariables({
      profile,
      accountSettings,
      context: {
        guest_name: guestName,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        personas: totalGuests,
        reference: referenceDisplay,
        total,
      },
    }),
    nombre_huesped: guestName,
    telefono_huesped: inquiry?.guest_phone || '-',
    fechas: checkIn && checkOut ? `${formatDateLongEs(checkIn)} al ${formatDateLongEs(checkOut)}` : '-',
    noches: nights,
    personas: totalGuests,
    codigo_referencia: referenceDisplay,
    precio_noche: formatCop(pricePerNight),
    porcentaje_descuento: discountPercentage,
    valor_descuento: formatCop(discountAmount),
    fecha_checkin_larga: formatDateLongEs(checkIn),
    fecha_checkout_larga: formatDateLongEs(checkOut),
    fecha_vigencia: validityDate,
    unidades,
    descuento: discountPercentage > 0
      ? {
          porcentaje_descuento: discountPercentage,
          valor_descuento: formatCop(discountAmount),
        }
      : null,
    amenidades_comunes: String(inquiry?.amenidades_comunes || profile?.short_description || '').trim(),
    url_cotizacion: quoteUrl || '-',
  }

  const resolved = resolveTemplate(templateToUse, templateVariables)
  return resolved.text.trim()
}

export const copyQuotationAsWhatsApp = async (inquiry, profile, quoteUrl = '', options = {}) => {
  const message = buildQuotationWhatsAppMessage(inquiry, profile, quoteUrl, options)
  await navigator.clipboard.writeText(message)
  return message
}
