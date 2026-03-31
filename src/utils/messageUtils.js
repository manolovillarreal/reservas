import { formatReferenceDisplay } from './referenceUtils'

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const shortDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const normalizeDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const formatDate = (value) => {
  const date = normalizeDate(value)
  if (!date) return '-'
  return shortDateFormatter.format(date)
}

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0))

const safeText = (value, fallback = '-') => {
  const str = String(value || '').trim()
  return str || fallback
}

const countNights = (checkIn, checkOut) => {
  const start = normalizeDate(checkIn)
  const end = normalizeDate(checkOut)
  if (!start || !end) return 0
  const diff = (end.getTime() - start.getTime()) / 86400000
  return diff > 0 ? Math.ceil(diff) : 0
}

export const resolveTemplate = (template, variables) => {
  const missing = new Set()

  const isEmptyValue = (value) => {
    if (value === undefined || value === null) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return value === false
  }

  const resolveValue = (ctx, key) => {
    if (!ctx || typeof ctx !== 'object') return undefined
    return ctx[key]
  }

  const renderSection = (input, ctx) => {
    const source = String(input || '')
    const blockPattern = /{{#\s*([^}]+?)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g

    const withBlocks = source.replace(blockPattern, (_match, rawKey, inner) => {
      const key = String(rawKey || '').trim()
      const value = resolveValue(ctx, key)

      if (Array.isArray(value)) {
        if (value.length === 0) return ''
        const renderedItems = value
          .map((item) => {
            const nextCtx = item && typeof item === 'object'
              ? { ...ctx, ...item }
              : { ...ctx, [key]: item }
            return renderSection(inner, nextCtx).trim()
          })
          .filter(Boolean)
        return renderedItems.join('\n')
      }

      if (isEmptyValue(value)) {
        return ''
      }

      const nextCtx = value && typeof value === 'object'
        ? { ...ctx, ...value }
        : { ...ctx, [key]: value }
      return renderSection(inner, nextCtx)
    })

    return withBlocks.replace(/{{\s*([^#\/][^}]*)\s*}}/g, (_match, rawKey) => {
      const key = String(rawKey || '').trim()
      const value = resolveValue(ctx, key)
      if (value === undefined || value === null || value === '') {
        missing.add(key)
        return `{{${key}}}`
      }
      return String(value)
    })
  }

  return {
    text: renderSection(template, variables || {}),
    missing: [...missing],
  }
}

export const buildGlobalVariables = ({ profile = {}, accountSettings = {}, context = {} } = {}) => {
  const nombreAlojamiento = profile.commercial_name || profile.legal_name || accountSettings.property_name || 'Tu alojamiento'
  const telefono = profile.phone || '-'
  const ubicacion = profile.location_url || '-'
  const descripcionAlojamiento = profile.short_description || '-'
  const porcentajeAnticipo = accountSettings.anticipo_pct != null ? Number(accountSettings.anticipo_pct) : 50

  return {
    nombre_alojamiento: nombreAlojamiento,
    telefono,
    ubicacion,
    descripcion_alojamiento: descripcionAlojamiento,
    porcentaje_anticipo: porcentajeAnticipo,
    nombre_huesped: context.nombre_huesped || context.guest_name || '-',
    check_in: context.check_in ? formatDate(context.check_in) : '-',
    check_out: context.check_out ? formatDate(context.check_out) : '-',
    noches: context.nights ?? '-',
    personas: context.personas ?? '-',
    codigo_referencia: context.reference || '-',
    total: context.total != null ? formatCurrency(context.total) : '-',
    pagado: context.paid != null ? formatCurrency(context.paid) : '-',
    saldo_pendiente: context.balance != null ? formatCurrency(context.balance) : '-',
  }
}

const buildUnitsBlock = (units = [], { showAmenities = true } = {}) => {
  if (!units.length) return ['Sin unidades asignadas.']
  return units.map((unit) => {
    const name = safeText(unit.name, 'Unidad')
    const description = safeText(unit.description, '')
    if (!showAmenities || !description) return `- ${name}`
    return `- ${name}: ${description}`
  })
}

export const buildQuotationMessage = ({
  inquiry,
  systemSettings,
  globalVariables,
  selectedUnits = [],
  venueUnits = [],
}) => {
  const settings = systemSettings || {}
  const nights = countNights(inquiry?.check_in, inquiry?.check_out)
  const totalGuests = Number(inquiry?.adults || 0) + Number(inquiry?.children || 0)
  const pricePerNight = Number(inquiry?.price_per_night || 0)
  const discountPct = Number(inquiry?.discount_percentage || 0)
  const subtotal = pricePerNight * Math.max(nights, 0)
  const discountAmount = subtotal * (discountPct / 100)
  const total = Math.max(subtotal - discountAmount, 0)
  const reference = formatReferenceDisplay(inquiry?.reference_code || inquiry?.quotation_number, inquiry?.guest_name)

  const selectedIds = new Set((inquiry?.unit_ids || []).filter(Boolean))
  const selected = selectedUnits.filter((unit) => selectedIds.has(unit.id))
  const venueIds = new Set(selected.map((unit) => unit.venue_id).filter(Boolean))
  const sameVenue = venueIds.size === 1
  const activeVenueUnits = sameVenue ? venueUnits.filter((unit) => unit.venue_id === [...venueIds][0]) : []
  const isFullHouse = selected.length > 0 && activeVenueUnits.length > 0 && selected.length === activeVenueUnits.length

  const variant = selected.length === 0 ? 'no_units' : (isFullHouse ? 'full_house' : 'by_units')

  const vars = {
    ...globalVariables,
    nombre_huesped: inquiry?.guest_name || '-',
    check_in: formatDate(inquiry?.check_in),
    check_out: formatDate(inquiry?.check_out),
    noches: nights,
    personas: totalGuests,
    codigo_referencia: reference,
    total: formatCurrency(total),
  }

  const greeting = resolveTemplate(settings.quotation_greeting || '', vars)
  const intro = resolveTemplate(settings.quotation_intro || '', vars)
  const closing = resolveTemplate(settings.quotation_closing || '', vars)
  const signature = resolveTemplate(settings.quotation_signature || '', vars)

  const lines = [greeting.text, '', intro.text, '', `Fechas: ${formatDate(inquiry?.check_in)} -> ${formatDate(inquiry?.check_out)}`, `Noches: ${nights}`, `Personas: ${totalGuests}`]

  if (variant === 'no_units') {
    if (pricePerNight > 0) lines.push(`Precio estimado por noche: ${formatCurrency(pricePerNight)}`)
  }

  if (variant === 'by_units') {
    lines.push('', 'Unidades:')
    lines.push(...buildUnitsBlock(selected, { showAmenities: true }))
  }

  if (variant === 'full_house') {
    const totalCapacity = activeVenueUnits.reduce((sum, unit) => sum + Number(unit.capacity || 0), 0)
    lines.push('', 'Full house:')
    lines.push(`- Unidades: ${activeVenueUnits.length}`)
    lines.push(`- Capacidad total: ${totalCapacity} personas`)
  }

  lines.push('', `Código de referencia: ${reference}`)

  if (pricePerNight > 0) {
    lines.push(`Precio por noche: ${formatCurrency(pricePerNight)}`)
    if (discountPct > 0) {
      lines.push(`Descuento (${discountPct}%): -${formatCurrency(discountAmount)}`)
    }
    lines.push(`Total: ${formatCurrency(total)}`)
  }

  if (inquiry?.quote_expires_at) {
    lines.push(`Vigencia: ${formatDate(inquiry.quote_expires_at)}`)
  }

  lines.push('', closing.text, signature.text)

  const missing = [...new Set([...greeting.missing, ...intro.missing, ...closing.missing, ...signature.missing])]

  return {
    text: lines.filter((line) => line !== '').join('\n').replace(/\n\n+/g, '\n\n').trim(),
    missing,
    variant,
  }
}

export const buildVoucherMessage = ({
  reservation,
  systemSettings,
  globalVariables,
  showUnitAmenities = true,
  voucherConditions = '',
}) => {
  const settings = systemSettings || {}
  const units = (reservation?.reservation_units || []).map((row) => row.units).filter(Boolean)
  const nights = countNights(reservation?.check_in, reservation?.check_out)
  const guests = Number(reservation?.adults || 0) + Number(reservation?.children || 0)
  const total = Number(reservation?.total_amount || 0)
  const paid = Number(reservation?.paid_amount || 0)
  const balance = Math.max(0, total - paid)
  const reference = formatReferenceDisplay(reservation?.reference_code, reservation?.guest_name)

  const vars = {
    ...globalVariables,
    nombre_huesped: reservation?.guest_name || globalVariables.nombre_huesped || '-',
    check_in: formatDate(reservation?.check_in),
    check_out: formatDate(reservation?.check_out),
    noches: nights,
    personas: guests,
    codigo_referencia: reference,
    total: formatCurrency(total),
    pagado: formatCurrency(paid),
    saldo_pendiente: formatCurrency(balance),
  }

  const greeting = resolveTemplate(settings.voucher_greeting || '', vars)
  const intro = resolveTemplate(settings.voucher_intro || '', vars)
  const closing = resolveTemplate(settings.voucher_closing || '', vars)
  const signature = resolveTemplate(settings.voucher_signature || '', vars)

  const lines = [
    greeting.text,
    '',
    intro.text,
    '',
    `Fechas: ${formatDate(reservation?.check_in)} -> ${formatDate(reservation?.check_out)}`,
    `Noches: ${nights}`,
    `Personas: ${guests}`,
    '',
    'Unidades:',
    ...buildUnitsBlock(units, { showAmenities: showUnitAmenities }),
    '',
    `Código de referencia: ${reference}`,
    `Total: ${formatCurrency(total)}`,
  ]

  if (paid > 0 && balance <= 0) {
    lines.push(`Pagado: ${formatCurrency(paid)}`)
  } else if (paid > 0 && balance > 0) {
    lines.push(`Pagado: ${formatCurrency(paid)}`)
    lines.push(`Saldo pendiente: ${formatCurrency(balance)}`)
  } else {
    lines.push(`Pendiente: ${formatCurrency(total)}`)
  }

  lines.push(`Check-in: ${safeText(settings.checkin_time, '-')}`)
  lines.push(`Check-out: ${safeText(settings.checkout_time, '-')}`)

  if (String(voucherConditions || '').trim()) {
    lines.push('', `Condiciones: ${String(voucherConditions).trim()}`)
  }

  lines.push('', closing.text, signature.text)

  const missing = [...new Set([...greeting.missing, ...intro.missing, ...closing.missing, ...signature.missing])]

  return {
    text: lines.filter((line) => line !== '').join('\n').replace(/\n\n+/g, '\n\n').trim(),
    missing,
  }
}
