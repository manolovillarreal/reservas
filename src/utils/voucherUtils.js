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

export const DEFAULT_PREREGISTRO_TEMPLATE = `Hola {{nombres}}! 👋

Para completar tu reserva en {{nombre_alojamiento}}, te pedimos diligenciar el pre-registro antes de tu llegada.

🗓 Check-in: {{fecha_checkin_larga}}

📋 Completa tu información aquí:
{{link_preregistro}}

⚠️ Este link es personal. Contiene información de tu reserva — no lo compartas con personas que no sean de tu grupo.

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

const splitGuestName = (reservation = {}) => {
  const firstName = String(reservation?.guests?.first_name || '').trim()
  const lastName = String(reservation?.guests?.last_name || '').trim()

  if (firstName || lastName) {
    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
    }
  }

  const fallbackName = String(
    reservation?.guestName || reservation?.guest_name || reservation?.nombre_huesped || ''
  ).trim()
  const parts = fallbackName ? fallbackName.split(/\s+/) : []

  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
    fullName: fallbackName,
  }
}

export const buildVoucherWhatsAppMessage = (reservation, profile, options = {}) => {
  const guest = splitGuestName(reservation)
  const nights = Number(options?.nights ?? reservation?.nights ?? 0)
  const totalGuests = Number(reservation?.adults || 0) + Number(reservation?.children || 0)
  const total = Number(reservation?.total_amount || reservation?.total || 0)
  const paid = Number(reservation?.paid_amount || reservation?.paid || 0)
  const balance = Math.max(0, total - paid)
  const referenceCode = reservation?.reference_code || reservation?.referenceCode || reservation?.reservation_number || '-'
  const referenceDisplay = formatReferenceDisplay(referenceCode, guest.fullName)
  const units = (reservation?.reservation_units || []).map((row) => row?.units).filter(Boolean)
  const templateToUse = String(options?.systemTemplate || '').trim() || DEFAULT_VOUCHER_TEMPLATE
  const voucherConditions = String(options?.voucherConditions || reservation?.voucher_conditions || '').trim()
  const globalVars = buildGlobalVariables({
    profile,
    accountSettings: options?.accountSettings || {},
    context: {
      nombres: guest.firstName,
      apellidos: guest.lastName,
      nombre_completo: guest.fullName,
      guest_first_name: guest.firstName,
      guest_last_name: guest.lastName,
      guest_name: guest.fullName,
      check_in: reservation?.check_in,
      check_out: reservation?.check_out,
      nights,
      personas: totalGuests,
      reference: referenceDisplay,
      total,
      paid,
      balance,
    },
  })

  const templateVariables = {
    ...globalVars,
    nombre_huesped: guest.fullName || globalVars.nombre_huesped,
    telefono_huesped: reservation?.guests?.phone || reservation?.guest_phone || '-',
    fechas: reservation?.check_in && reservation?.check_out
      ? `${formatDateLongEs(reservation.check_in)} al ${formatDateLongEs(reservation.check_out)}`
      : '-',
    noches: nights,
    personas: totalGuests,
    codigo_referencia: referenceDisplay,
    total: formatCop(total),
    pagado: formatCop(paid),
    saldo_pendiente: formatCop(balance),
    fecha_checkin_larga: formatDateLongEs(reservation?.check_in),
    fecha_checkout_larga: formatDateLongEs(reservation?.check_out),
    hora_checkin: options?.systemSettings?.checkin_time || '3:00 PM',
    hora_checkout: options?.systemSettings?.checkout_time || '12:00 PM',
    condiciones: voucherConditions,
    unidades: units.map((unit) => ({
      nombre_unidad: unit?.name || 'Unidad',
      descripcion_unidad: unit?.description || '',
    })),
    pago_completo: total > 0 && paid >= total ? { total: formatCop(total), pagado: formatCop(paid) } : null,
    saldo_pendiente: paid > 0 && balance > 0
      ? { total: formatCop(total), pagado: formatCop(paid), saldo_pendiente: formatCop(balance) }
      : null,
    sin_pagos: paid <= 0 ? { total: formatCop(total) } : null,
  }

  return resolveTemplate(templateToUse, templateVariables).text.trim()
}

export const copyAsWhatsApp = async (reservation, profile, options = {}) => {
  const message = buildVoucherWhatsAppMessage(reservation, profile, options)
  await navigator.clipboard.writeText(message)
  return message
}

export const buildQuotationWhatsAppMessage = (inquiry, profile, quoteUrl = '', options = {}) => {
  const systemTemplate = String(options?.systemTemplate || '').trim()
  const accountSettings = options?.accountSettings || {}

  const guestName = [inquiry?.guest_first_name, inquiry?.guest_last_name].filter(Boolean).join(' ') || 'huesped'
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
  const referenceDisplay = formatReferenceDisplay(referenceCode, [inquiry?.guest_first_name, inquiry?.guest_last_name].filter(Boolean).join(' ') || '')
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
    amenidades_comunes: String(inquiry?.amenidades_comunes || '').trim() || buildGlobalVariables({
      profile,
      accountSettings,
      context: {
        amenidades_comunes: inquiry?.amenidades_comunes,
      },
    }).amenidades_comunes,
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
