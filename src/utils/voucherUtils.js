import { formatReferenceDisplay } from './referenceUtils'
import { buildReservationContext, buildGlobalVariables, resolveTemplate } from './messageUtils'

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

{{#politica_reserva}}
📌 Política de reserva:
{{politica_reserva}}
{{/politica_reserva}}

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

{{#politica_reserva}}
📌 Política de reserva:
{{politica_reserva}}
{{/politica_reserva}}

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
  const templateToUse = String(options?.systemTemplate || '').trim() || DEFAULT_VOUCHER_TEMPLATE
  const templateVariables = buildReservationContext({
    reservation: {
      ...reservation,
      nights: Number(options?.nights ?? reservation?.nights ?? 0) || reservation?.nights,
    },
    accountProfile: {
      ...(options?.accountSettings || {}),
      ...profile,
      voucher_conditions: options?.voucherConditions || reservation?.voucher_conditions || options?.accountSettings?.voucher_conditions || '',
    },
    messageSettings: {
      ...(options?.accountSettings || {}),
      ...(options?.systemSettings || {}),
      voucher_conditions: options?.voucherConditions || reservation?.voucher_conditions || options?.accountSettings?.voucher_conditions || '',
    },
  })

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
  const templateToUse = systemTemplate || DEFAULT_QUOTATION_TEMPLATE

  const templateVariables = {
    ...buildReservationContext({
      inquiry: {
        ...inquiry,
        units: Array.isArray(options?.units) && options.units.length
          ? options.units
          : (inquiry?.inquiry_units || []).map((row) => row?.units || row).filter(Boolean),
      },
      accountProfile: {
        ...accountSettings,
        ...profile,
      },
      messageSettings: accountSettings,
    }),
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
