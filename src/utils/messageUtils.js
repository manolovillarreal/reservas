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

const formatDate = (value) => {
  const date = normalizeDate(value)
  if (!date) return '-'
  return date.toISOString().slice(0, 10)
}

const formatDateLong = (value) => {
  const date = normalizeDate(value)
  if (!date) return '-'
  return longDateFormatter.format(date)
}

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0))

const safeText = (value, fallback = '-') => {
  const str = String(value || '').trim()
  return str || fallback
}

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const countNights = (checkIn, checkOut) => {
  const start = normalizeDate(checkIn)
  const end = normalizeDate(checkOut)
  if (!start || !end) return 0
  const diff = (end.getTime() - start.getTime()) / 86400000
  return diff > 0 ? Math.ceil(diff) : 0
}

export const formatTime = (value) => {
  if (!value) return null
  const timeStr = String(value || '').trim()
  if (!timeStr) return null
  const [hours, minutes] = timeStr.split(':').slice(0, 2)
  const h = parseInt(hours, 10)
  const m = parseInt(minutes, 10)
  if (isNaN(h) || isNaN(m)) return null
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }).format(
    new Date(2000, 0, 1, h, m)
  )
}

const resolveGuestData = (record = {}) => {
  const firstName = String(record?.guests?.first_name || record?.guest_first_name || '').trim()
  const lastName = String(record?.guests?.last_name || record?.guest_last_name || '').trim()
  const fullName = String(
    [firstName, lastName].filter(Boolean).join(' ') ||
    record?.guest_name ||
    record?.nombre_huesped ||
    ''
  ).trim()

  return { firstName, lastName, fullName }
}

const buildUnitsContext = (record = {}) => {
  const directUnits = Array.isArray(record?.units) ? record.units : []
  const inquiryUnits = Array.isArray(record?.inquiry_units)
    ? record.inquiry_units.map((row) => row?.units || row).filter(Boolean)
    : []
  const reservationUnits = Array.isArray(record?.reservation_units)
    ? record.reservation_units.map((row) => row?.units || row).filter(Boolean)
    : []

  const selectedUnits = directUnits.length ? directUnits : (reservationUnits.length ? reservationUnits : inquiryUnits)

  return selectedUnits
    .map((unit) => {
      const nombreUnidad = String(unit?.name || '').trim()
      const descripcionUnidad = String(unit?.description || '').trim()
      if (!nombreUnidad && !descripcionUnidad) return null
      return {
        nombre_unidad: nombreUnidad || 'Unidad',
        descripcion_unidad: descripcionUnidad || '',
      }
    })
    .filter(Boolean)
}

const buildPublicPreregistroUrl = (token) => {
  const rawToken = String(token || '').trim()
  if (!rawToken) return ''

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const base = String(import.meta.env?.VITE_APP_URL || origin || '').replace(/\/$/, '')
  return base ? `${base}/prerregistro/${rawToken}` : `/prerregistro/${rawToken}`
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

  const cleanupBlankLines = (value) => String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const renderSection = (input, ctx) => {
    const source = String(input || '')
    const blockPattern = /{{([#^])\s*([^}]+?)\s*}}([\s\S]*?){{\/\s*\2\s*}}/g

    const withBlocks = source.replace(blockPattern, (_match, sectionType, rawKey, inner) => {
      const key = String(rawKey || '').trim()
      const value = resolveValue(ctx, key)

      if (sectionType === '^') {
        if (isEmptyValue(value)) {
          return renderSection(inner, ctx)
        }
        return ''
      }

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
      const rawValue = resolveValue(ctx, key)
      const value = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? (rawValue[key] ?? rawValue.texto ?? rawValue.saldo ?? rawValue.valor ?? rawValue.valor_descuento ?? '')
        : rawValue

      if (value === undefined || value === null || value === '') {
        missing.add(key)
        return `{{${key}}}`
      }
      return String(value)
    })
  }

  return {
    text: cleanupBlankLines(renderSection(template, variables || {})),
    missing: [...missing],
  }
}

/**
 * check_in y check_out son aliases de fecha_checkin y fecha_checkout
 * para mantener compatibilidad con plantillas existentes.
 */
export const buildReservationContext = ({
  reservation = null,
  inquiry = null,
  accountProfile = {},
  messageSettings = {},
} = {}) => {
  const record = reservation || inquiry || {}
  const guest = resolveGuestData(record)
  const checkInRaw = record?.check_in || null
  const checkOutRaw = record?.check_out || null
  const nightsCandidate = Number(record?.nights)
  const nights = Number.isFinite(nightsCandidate) && nightsCandidate > 0
    ? nightsCandidate
    : countNights(checkInRaw, checkOutRaw)

  const adults = toNumber(record?.adults)
  const minors = toNumber(record?.minors)
  const children = toNumber(record?.children)
  const infants = toNumber(record?.infants)
  const personas = adults + minors + children + infants

  const pricePerNightValue = toNumber(record?.price_per_night)
  const subtotal = pricePerNightValue * Math.max(nights, 0)
  const percentageDiscount = toNumber(record?.discount_percentage)
  const discountValue = percentageDiscount > 0 ? subtotal * (percentageDiscount / 100) : 0
  const totalBase = record?.total_amount != null
    ? toNumber(record?.total_amount)
    : (record?.total != null ? toNumber(record?.total) : Math.max(subtotal - discountValue, 0))
  const pagadoBase = record?.paid_amount != null ? toNumber(record?.paid_amount) : toNumber(record?.paid)
  const saldo = Math.max(totalBase - pagadoBase, 0)

  const referenceCode = record?.reference_code || record?.referenceCode || record?.quotation_number || record?.reservation_number || record?.inquiry_number || '-'
  const codigoReferencia = formatReferenceDisplay(referenceCode, guest.fullName)
  const mergedProfile = { ...messageSettings, ...accountProfile }
  const voucherConditions = String(
    mergedProfile?.voucher_conditions ||
    record?.voucher_conditions ||
    ''
  ).trim()
  const politicaReserva = String(mergedProfile?.politica_reserva || '').trim()
  const amenidadesComunes = String(
    mergedProfile?.amenidades_generales ||
    mergedProfile?.common_amenities ||
    record?.amenidades_comunes ||
    ''
  ).trim()

  // Compatibilidad: message_settings aún puede exponer estos campos,
  // pero la fuente oficial ahora es account_profile.
  const horaCheckin = String(mergedProfile?.checkin_time || '3:00 PM').trim() || '3:00 PM'
  const horaCheckout = String(mergedProfile?.checkout_time || '12:00 PM').trim() || '12:00 PM'

  return {
    guest_first_name: guest.firstName || '',
    guest_last_name: guest.lastName || '',
    guest_name: guest.fullName || '-',
    reference: codigoReferencia,
    telefono_huesped: record?.guests?.phone || record?.guest_phone || '-',
    nombre_completo: guest.fullName || '-',
    nombres: guest.firstName || '-',
    apellidos: guest.lastName || '-',
    nombre_huesped: guest.fullName || '-',
    fecha_checkin: formatDate(checkInRaw),
    fecha_checkout: formatDate(checkOutRaw),
    fecha_checkin_larga: formatDateLong(checkInRaw),
    fecha_checkout_larga: formatDateLong(checkOutRaw),
    check_in: formatDate(checkInRaw),
    check_out: formatDate(checkOutRaw),
    fechas: checkInRaw && checkOutRaw ? `${formatDateLong(checkInRaw)} al ${formatDateLong(checkOutRaw)}` : '-',
    noches: nights,
    fecha_vigencia: record?.quote_expires_at ? formatDateLong(record.quote_expires_at) : null,
    personas,
    precio_noche: pricePerNightValue > 0 ? formatCurrency(pricePerNightValue) : null,
    total: formatCurrency(totalBase),
    pagado: formatCurrency(pagadoBase),
    saldo: saldo > 0 ? formatCurrency(saldo) : null,
    porcentaje_anticipo: mergedProfile?.anticipo_pct != null ? Number(mergedProfile.anticipo_pct) : 50,
    codigo_referencia: codigoReferencia,
    porcentaje_descuento: percentageDiscount > 0 ? percentageDiscount : null,
    valor_descuento: percentageDiscount > 0 ? formatCurrency(discountValue) : null,
    nombre_alojamiento: mergedProfile?.name || mergedProfile?.commercial_name || mergedProfile?.legal_name || mergedProfile?.property_name || 'Tu alojamiento',
    telefono: mergedProfile?.phone || '-',
    ubicacion: mergedProfile?.location_url || '-',
    descripcion_alojamiento: mergedProfile?.short_description || '-',
    descripcion_detallada: String(mergedProfile?.descripcion_detallada || '').trim() || null,
    amenidades_comunes: amenidadesComunes || null,
    condiciones: voucherConditions || null,
    politica_reserva: politicaReserva || null,
    hora_checkin: horaCheckin,
    hora_checkout: horaCheckout,
    hora_llegada: formatTime(record?.estimated_arrival_time) || null,
    numero_vuelo: record?.flight_number || null,
    link_preregistro: record?.preregistro_token_raw || record?.preregistro_token
      ? buildPublicPreregistroUrl(record?.preregistro_token_raw || record?.preregistro_token)
      : null,
    unidades: buildUnitsContext(record),
    descuento: percentageDiscount > 0
      ? {
          porcentaje_descuento: percentageDiscount,
          valor_descuento: formatCurrency(discountValue),
        }
      : null,
    pago_completo: totalBase > 0 && pagadoBase >= totalBase,
    saldo_pendiente: saldo > 0
      ? {
          total: formatCurrency(totalBase),
          pagado: formatCurrency(pagadoBase),
          saldo: formatCurrency(saldo),
          saldo_pendiente: formatCurrency(saldo),
        }
      : null,
    sin_pagos: pagadoBase <= 0,
  }
}

export const buildGlobalVariables = ({ profile = {}, accountSettings = {}, context = {} } = {}) => {
  return buildReservationContext({
    inquiry: context,
    accountProfile: { ...accountSettings, ...profile },
    messageSettings: accountSettings,
  })
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
  const inquiryGuestName = `${inquiry?.guest_first_name || ''} ${inquiry?.guest_last_name || ''}`.trim() || '-'
  const reference = formatReferenceDisplay(inquiry?.reference_code || inquiry?.quotation_number, inquiryGuestName)

  const selectedIds = new Set((inquiry?.unit_ids || []).filter(Boolean))
  const selected = selectedUnits.filter((unit) => selectedIds.has(unit.id))
  const venueIds = new Set(selected.map((unit) => unit.venue_id).filter(Boolean))
  const sameVenue = venueIds.size === 1
  const activeVenueUnits = sameVenue ? venueUnits.filter((unit) => unit.venue_id === [...venueIds][0]) : []
  const isFullHouse = selected.length > 0 && activeVenueUnits.length > 0 && selected.length === activeVenueUnits.length

  const variant = selected.length === 0 ? 'no_units' : (isFullHouse ? 'full_house' : 'by_units')

  const vars = {
    ...globalVariables,
    nombre_completo: inquiryGuestName,
    nombres: inquiry?.guest_first_name || '-',
    apellidos: inquiry?.guest_last_name || '-',
    nombre_huesped: inquiryGuestName,
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
  const voucherGuest = reservation?.guests
  const voucherGuestName = voucherGuest
    ? `${voucherGuest.first_name || ''} ${voucherGuest.last_name || ''}`.trim()
    : globalVariables.nombre_huesped || '-'
  const reference = formatReferenceDisplay(reservation?.reference_code, voucherGuestName)

  const vars = {
    ...globalVariables,
    nombre_completo: voucherGuestName,
    nombres: voucherGuest?.first_name || '-',
    apellidos: voucherGuest?.last_name || '-',
    nombre_huesped: voucherGuestName,
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

  lines.push(`Check-in: ${safeText(vars.hora_checkin, '-')}`)
  lines.push(`Check-out: ${safeText(vars.hora_checkout, '-')}`)

  if (String(vars.condiciones || voucherConditions || '').trim()) {
    lines.push('', `Condiciones: ${String(vars.condiciones || voucherConditions).trim()}`)
  }

  if (String(vars.politica_reserva || '').trim()) {
    lines.push('', `Política de reserva: ${String(vars.politica_reserva).trim()}`)
  }

  lines.push('', closing.text, signature.text)

  const missing = [...new Set([...greeting.missing, ...intro.missing, ...closing.missing, ...signature.missing])]

  return {
    text: lines.filter((line) => line !== '').join('\n').replace(/\n\n+/g, '\n\n').trim(),
    missing,
  }
}

// ---------------------------------------------------------------------------
// Catálogo centralizado de variables y bloques del motor Mustache
// ---------------------------------------------------------------------------

export const VARIABLE_CATALOG = {
  simples: {
    huesped: [
      { key: 'nombre_completo', label: 'Nombre completo', ejemplo: 'Santiago Montero' },
      { key: 'nombres', label: 'Nombres', ejemplo: 'Santiago' },
      { key: 'apellidos', label: 'Apellidos', ejemplo: 'Montero' },
      { key: 'nombre_huesped', label: 'Alias nombre completo', ejemplo: 'Santiago Montero' },
    ],
    fechas: [
      { key: 'fecha_checkin', label: 'Check-in (fecha)', ejemplo: '2026-06-12' },
      { key: 'fecha_checkout', label: 'Check-out (fecha)', ejemplo: '2026-06-15' },
    ],
    disponibilidad: [
      { key: 'fecha_checkin_larga', label: 'Check-in (texto)', ejemplo: 'viernes, 12 de junio de 2026' },
      { key: 'fecha_checkout_larga', label: 'Check-out (texto)', ejemplo: 'lunes, 15 de junio de 2026' },
      { key: 'noches', label: 'Noches', ejemplo: '3' },
      { key: 'personas', label: 'Personas', ejemplo: '4' },
      { key: 'precio_noche', label: 'Precio por noche', ejemplo: '$840.000' },
    ],
    precio: [
      { key: 'total', label: 'Total', ejemplo: '$2.394.000' },
      { key: 'pagado', label: 'Pagado', ejemplo: '$600.000' },
      { key: 'saldo_pendiente', label: 'Saldo pendiente', ejemplo: '$600.000' },
      { key: 'porcentaje_anticipo', label: '% Anticipo', ejemplo: '50' },
      { key: 'codigo_referencia', label: 'Código', ejemplo: '25KBXM' },
      { key: 'fecha_vigencia', label: 'Vigencia', ejemplo: '31 de marzo de 2026' },
    ],
    alojamiento: [
      { key: 'nombre_alojamiento', label: 'Nombre', ejemplo: 'Marmanu House' },
      { key: 'telefono', label: 'Teléfono', ejemplo: '3102040245' },
      { key: 'ubicacion', label: 'Ubicación', ejemplo: 'https://maps.app.goo.gl/xxxxx' },
      { key: 'descripcion_alojamiento', label: 'Descripción', ejemplo: 'Casa vacacional frente al mar...' },
      { key: 'descripcion_detallada', label: 'Descripción detallada', ejemplo: 'Casa de tres niveles con vista al mar y terrazas privadas...' },
      { key: 'amenidades_comunes', label: 'Amenidades generales', ejemplo: 'WiFi, piscina, parqueadero' },
      { key: 'politica_reserva', label: 'Política de reserva', ejemplo: 'Cancelación gratuita hasta 48h antes' },
    ],
    checkin: [
      { key: 'hora_checkin', label: 'Hora check-in', ejemplo: '3:00 PM' },
      { key: 'hora_checkout', label: 'Hora check-out', ejemplo: '12:00 PM' },
      { key: 'hora_llegada', label: 'Hora estimada de llegada', ejemplo: '3:00 PM' },
      { key: 'numero_vuelo', label: 'Número de vuelo', ejemplo: 'AA1234' },
      { key: 'condiciones', label: 'Condiciones', ejemplo: 'No mascotas. No fiestas.' },
    ],
    preregistro: [
      { key: 'link_preregistro', label: 'Link de pre-registro', ejemplo: 'https://app.tekmiinn.com/prerregistro/abc123...' },
    ],
  },
  bloques: [
    {
      key: 'unidades',
      label: 'Unidades',
      descripcion: 'Se repite por cada unidad. Si no hay unidades el bloque desaparece completo.',
      variables_internas: ['nombre_unidad', 'descripcion_unidad'],
      template: '{{#unidades}}\n🚪 {{nombre_unidad}}\n{{descripcion_unidad}}\n{{/unidades}}',
    },
    {
      key: 'descuento',
      label: 'Descuento',
      descripcion: 'Solo aparece si hay descuento aplicado.',
      variables_internas: ['porcentaje_descuento', 'valor_descuento'],
      template: '{{#descuento}}\n🎁 Descuento ({{porcentaje_descuento}}%): -{{valor_descuento}}\n{{/descuento}}',
    },
    {
      key: 'amenidades_comunes',
      label: 'Amenidades comunes',
      descripcion: 'Solo aparece si el alojamiento tiene amenidades configuradas.',
      variables_internas: ['amenidades_comunes'],
      template: '{{#amenidades_comunes}}\n{{amenidades_comunes}}\n{{/amenidades_comunes}}',
    },
    {
      key: 'fecha_vigencia',
      label: 'Vigencia condicional',
      descripcion: 'Solo aparece si hay fecha de vigencia definida.',
      variables_internas: [],
      template: '{{#fecha_vigencia}}\n⏰ Válida hasta: {{fecha_vigencia}}\n{{/fecha_vigencia}}',
    },
    {
      key: 'pago_completo',
      label: 'Pago completo',
      descripcion: 'Solo aparece si el pago está completo.',
      variables_internas: ['total', 'pagado'],
      template: '{{#pago_completo}}\n💵 Total: {{total}}\n✅ Pagado: {{pagado}}\n{{/pago_completo}}',
    },
    {
      key: 'saldo_pendiente',
      label: 'Saldo pendiente',
      descripcion: 'Solo aparece si hay saldo pendiente.',
      variables_internas: ['total', 'pagado', 'saldo_pendiente'],
      template: '{{#saldo_pendiente}}\n💵 Total: {{total}}\n💳 Pagado: {{pagado}}\n⚠️ Saldo pendiente: {{saldo_pendiente}}\n{{/saldo_pendiente}}',
    },
    {
      key: 'sin_pagos',
      label: 'Sin pagos',
      descripcion: 'Solo aparece si no hay ningún pago registrado.',
      variables_internas: ['total'],
      template: '{{#sin_pagos}}\n💵 Total: {{total}}\n⏳ Pendiente: {{total}}\n{{/sin_pagos}}',
    },
    {
      key: 'condiciones',
      label: 'Condiciones',
      descripcion: 'Solo aparece si hay condiciones del alojamiento configuradas.',
      variables_internas: ['condiciones'],
      template: '{{#condiciones}}\n📋 {{condiciones}}\n{{/condiciones}}',
    },
    {
      key: 'politica_reserva',
      label: 'Política de reserva',
      descripcion: 'Solo aparece si hay política de reserva configurada.',
      variables_internas: ['politica_reserva'],
      template: '{{#politica_reserva}}\n{{politica_reserva}}\n{{/politica_reserva}}',
    },
  ],
}

export function generateAiPrompt() {
  return [
    'Necesito construir un mensaje de WhatsApp para mi alojamiento usando un sistema de plantillas con variables y bloques.',
    '',
    'VARIABLES SIMPLES — se reemplazan por el valor real:',
    '  {{nombre_completo}} → Nombre completo — Ej: Santiago Montero',
    '  {{nombres}} → Nombres (solo nombres de pila) — Ej: Santiago',
    '  {{apellidos}} → Apellidos — Ej: Montero',
    '  {{nombre_huesped}} → Alias de nombre_completo (compatibilidad con plantillas anteriores)',
    '  {{fecha_checkin}} → Check-in (fecha) — Ej: 2026-06-12',
    '  {{fecha_checkout}} → Check-out (fecha) — Ej: 2026-06-15',
    '  {{fecha_checkin_larga}} → Check-in (texto) — Ej: viernes, 12 de junio de 2026',
    '  {{fecha_checkout_larga}} → Check-out (texto) — Ej: lunes, 15 de junio de 2026',
    '  {{noches}} → Noches — Ej: 3',
    '  {{personas}} → Personas — Ej: 4',
    '  {{precio_noche}} → Precio por noche — Ej: $840.000',
    '  {{total}} → Total — Ej: $2.394.000',
    '  {{pagado}} → Pagado — Ej: $600.000',
    '  {{saldo_pendiente}} → Saldo pendiente — Ej: $600.000',
    '  {{porcentaje_anticipo}} → % Anticipo — Ej: 50',
    '  {{codigo_referencia}} → Código de referencia — Ej: 25KBXM',
    '  {{fecha_vigencia}} → Vigencia — Ej: 31 de marzo de 2026',
    '  {{nombre_alojamiento}} → Nombre del alojamiento — Ej: Marmanu House',
    '  {{telefono}} → Teléfono — Ej: 3102040245',
    '  {{ubicacion}} → Ubicación (Google Maps) — Ej: https://maps.app.goo.gl/xxxxx',
    '  {{descripcion_alojamiento}} → Descripción — Ej: Casa vacacional frente al mar...',
    '  {{descripcion_detallada}} → Descripción detallada — Ej: Casa de tres niveles con vista...',
    '  {{amenidades_comunes}} → Amenidades generales — Ej: WiFi, piscina, parqueadero',
    '  {{hora_checkin}} → Hora check-in — Ej: 3:00 PM',
    '  {{hora_checkout}} → Hora check-out — Ej: 12:00 PM',
    '  {{condiciones}} → Condiciones del alojamiento — Ej: No mascotas. No fiestas.',
    '  {{politica_reserva}} → Política de reserva — Ej: Cancelación gratuita hasta 48h antes',
    '  {{link_preregistro}} → Link de pre-registro — Ej: https://app.tekmiinn.com/prerregistro/abc123',
    '',
    'BLOQUES ITERANTES Y CONDICIONALES:',
    '  {{#unidades}}...{{/unidades}}',
    '  → Se repite por cada unidad. Si no hay unidades el bloque desaparece completo.',
    '  Variables internas: {{nombre_unidad}}, {{descripcion_unidad}}',
    '',
    '  {{#descuento}}...{{/descuento}}',
    '  → Solo aparece si hay descuento aplicado.',
    '  Variables internas: {{porcentaje_descuento}}, {{valor_descuento}}',
    '',
    '  {{#amenidades_comunes}}...{{/amenidades_comunes}}',
    '  → Solo aparece si hay amenidades configuradas.',
    '',
    '  {{#fecha_vigencia}}...{{/fecha_vigencia}}',
    '  → Solo aparece si hay fecha de vigencia.',
    '',
    '  {{#pago_completo}}...{{/pago_completo}}',
    '  → Solo aparece si el pago está completo.',
    '  Variables internas: {{total}}, {{pagado}}',
    '',
    '  {{#saldo_pendiente}}...{{/saldo_pendiente}}',
    '  → Solo aparece si hay saldo pendiente.',
    '  Variables internas: {{total}}, {{pagado}}, {{saldo_pendiente}}',
    '',
    '  {{#sin_pagos}}...{{/sin_pagos}}',
    '  → Solo si no hay ningún pago registrado.',
    '  Variables internas: {{total}}',
    '',
    '  {{#condiciones}}...{{/condiciones}}',
    '  → Solo si hay condiciones configuradas.',
    '',
    '  {{#politica_reserva}}...{{/politica_reserva}}',
    '  → Solo si hay política de reserva configurada.',
    '',
    '  {{^variable}}...{{/variable}}',
    '  → Else: aparece solo si la variable no existe o está vacía.',
    '',
    'REGLAS IMPORTANTES:',
    '  - Usar exactamente la sintaxis {{variable}} con dobles llaves',
    '  - Bloques abren con {{#nombre}} y cierran con {{/nombre}}',
    '  - Bloque else usa {{^nombre}}',
    '  - Puedes usar emojis libremente',
    '  - Texto fuera de bloques siempre aparece',
    '  - El sistema limpia líneas en blanco residuales dejando máximo una línea vacía entre párrafos',
    '',
    'Antes de construir el mensaje, hazme las preguntas necesarias para entender qué tipo de mensaje necesito, para qué situación es, qué información quiero mostrar y qué tono prefiero. Una vez tengas todo claro, construye el mensaje usando únicamente las variables y bloques del sistema descritos arriba.',
  ].join('\n')
}
