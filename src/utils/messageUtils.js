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
      const value = resolveValue(ctx, key)
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

export const buildGlobalVariables = ({ profile = {}, accountSettings = {}, context = {} } = {}) => {
  const nombreAlojamiento = profile.commercial_name || profile.legal_name || accountSettings.property_name || 'Tu alojamiento'
  const telefono = profile.phone || '-'
  const ubicacion = profile.location_url || '-'
  const descripcionAlojamiento = profile.short_description || '-'
  const porcentajeAnticipo = accountSettings.anticipo_pct != null ? Number(accountSettings.anticipo_pct) : 50

  const nombres = String(context.nombres || context.guest_first_name || '').trim()
  const apellidos = String(context.apellidos || context.guest_last_name || '').trim()
  const nombreCompleto = String(
    context.nombre_completo ||
    `${nombres} ${apellidos}`.trim() ||
    context.nombre_huesped ||
    context.guest_name ||
    ''
  ).trim()
  const checkIn = context.check_in ? formatDate(context.check_in) : '-'
  const checkOut = context.check_out ? formatDate(context.check_out) : '-'

  return {
    nombre_alojamiento: nombreAlojamiento,
    telefono,
    ubicacion,
    descripcion_alojamiento: descripcionAlojamiento,
    porcentaje_anticipo: porcentajeAnticipo,
    nombre_completo: nombreCompleto || '-',
    nombres: nombres || '-',
    apellidos: apellidos || '-',
    nombre_huesped: nombreCompleto || '-',
    check_in: checkIn,
    check_out: checkOut,
    fecha_checkin: checkIn,
    fecha_checkout: checkOut,
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
    ],
    checkin: [
      { key: 'hora_checkin', label: 'Hora check-in', ejemplo: '3:00 PM' },
      { key: 'hora_checkout', label: 'Hora check-out', ejemplo: '12:00 PM' },
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
    '  {{hora_checkin}} → Hora check-in — Ej: 3:00 PM',
    '  {{hora_checkout}} → Hora check-out — Ej: 12:00 PM',
    '  {{condiciones}} → Condiciones del alojamiento — Ej: No mascotas. No fiestas.',
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
