import { supabase } from './supabase'

export const DEFAULT_MESSAGE_SETTINGS = {
  show_unit_amenities: true,
  show_unit_count: true,
  show_unit_name: true,
  show_unit_description: false,
  show_quote_url: true,
  quotation_greeting: 'Hola {{nombres}}! 👋',
  quotation_intro: 'Te compartimos tu cotización de {{nombre_alojamiento}}.',
  quotation_closing: 'Para confirmar la reserva se solicita un anticipo del {{porcentaje_anticipo}}%.',
  quotation_signature: '{{nombre_alojamiento}} · {{telefono}}',
  voucher_greeting: 'Hola {{nombres}}! 👋',
  voucher_intro: 'Te compartimos el resumen de tu reserva en {{nombre_alojamiento}}.',
  voucher_closing: 'Cualquier duda estamos a tu disposición.',
  voucher_signature: '{{nombre_alojamiento}} · {{telefono}}',
  // Compatibilidad heredada: estos campos siguen aquí, pero la fuente oficial es account_profile.
  checkin_time: '3:00 PM',
  checkout_time: '12:00 PM',
}

export const DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE = `Hola! 👋

Gracias por tu interés en {{nombre_alojamiento}}.

Lamentablemente no tenemos disponibilidad para
las fechas que nos indicas:

🗓 Check-in: {{fecha_checkin_larga}}
🗓 Check-out: {{fecha_checkout_larga}}
🌙 {{noches}} noches · {{personas}} personas

Te invitamos a consultarnos otras fechas, con
gusto te ayudamos a encontrar la mejor opción. 😊

{{nombre_alojamiento}} · {{telefono}}`

export const DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE = `Hola! 👋

Tenemos disponibilidad para las fechas que
nos indicas. 🎉

🗓 Check-in: {{fecha_checkin_larga}}
🗓 Check-out: {{fecha_checkout_larga}}
🌙 {{noches}} noches · {{personas}} personas

{{#unidades}}
🚪 {{nombre_unidad}}
{{/unidades}}

{{#precio_noche}}
💰 Precio por noche: {{precio_noche}}
{{/precio_noche}}

{{#nombre_huesped}}
Para reservar a nombre de {{nombre_huesped}},
escríbenos y con gusto te ayudamos. 😊
{{/nombre_huesped}}
{{^nombre_huesped}}
Para reservar, escríbenos y con gusto
te ayudamos. 😊
{{/nombre_huesped}}

{{nombre_alojamiento}} · {{telefono}}`

const SYSTEM_MESSAGES = [
  { key: 'quotation', name: 'Cotización', sort_order: 0 },
  { key: 'voucher', name: 'Voucher', sort_order: 1 },
  {
    key: 'disponibilidad_negativa',
    name: 'Sin disponibilidad',
    sort_order: 3,
    body: DEFAULT_DISPONIBILIDAD_NEGATIVA_TEMPLATE,
  },
  {
    key: 'disponibilidad_positiva',
    name: 'Con disponibilidad',
    sort_order: 4,
    body: DEFAULT_DISPONIBILIDAD_POSITIVA_TEMPLATE,
  },
]

const normalizeMessageSettings = (data = {}) => ({
  ...DEFAULT_MESSAGE_SETTINGS,
  ...data,
})

const isMissingShowQuoteUrlColumnError = (error) => {
  const message = String(error?.message || '')
  return message.includes("'show_quote_url' column") && message.includes("message_settings")
}

const ensureSystemMessages = async (accountId) => {
  const { data, error } = await supabase
    .from('predefined_messages')
    .select('id, key')
    .eq('account_id', accountId)
    .eq('type', 'system')

  if (error) throw error

  const existingKeys = new Set((data || []).map((row) => row.key))
  const missing = SYSTEM_MESSAGES.filter((msg) => !existingKeys.has(msg.key))

  if (!missing.length) return

  const payload = missing.map((msg) => ({
    account_id: accountId,
    name: msg.name,
    body: msg.body || '',
    type: 'system',
    key: msg.key,
    sort_order: msg.sort_order,
    is_deletable: false,
  }))

  const { error: insertError } = await supabase
    .from('predefined_messages')
    .insert(payload)

  if (insertError) throw insertError
}

export const getMessageSettings = async (accountId) => {
  const { data, error } = await supabase
    .from('message_settings')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()

  if (error) throw error

  return normalizeMessageSettings(data || {})
}

export const saveMessageSettings = async (accountId, payload) => {
  const normalized = normalizeMessageSettings(payload)

  const basePayload = {
    account_id: accountId,
    show_unit_amenities: Boolean(normalized.show_unit_amenities),
    show_unit_count: Boolean(normalized.show_unit_count),
    show_unit_name: Boolean(normalized.show_unit_name),
    show_unit_description: Boolean(normalized.show_unit_description),
    quotation_greeting: normalized.quotation_greeting || null,
    quotation_intro: normalized.quotation_intro || null,
    quotation_closing: normalized.quotation_closing || null,
    quotation_signature: normalized.quotation_signature || null,
    voucher_greeting: normalized.voucher_greeting || null,
    voucher_intro: normalized.voucher_intro || null,
    voucher_closing: normalized.voucher_closing || null,
    voucher_signature: normalized.voucher_signature || null,
    checkin_time: normalized.checkin_time || null,
    checkout_time: normalized.checkout_time || null,
  }

  const upsertSettings = async (record) => {
    const { data, error } = await supabase
      .from('message_settings')
      .upsert(record, { onConflict: 'account_id' })
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  try {
    const data = await upsertSettings({
      ...basePayload,
      show_quote_url: Boolean(normalized.show_quote_url),
    })
    return normalizeMessageSettings(data)
  } catch (error) {
    if (!isMissingShowQuoteUrlColumnError(error)) throw error

    const data = await upsertSettings(basePayload)
    return normalizeMessageSettings(data)
  }
}

export const getPredefinedMessages = async (accountId, { includeSystem = true } = {}) => {
  await ensureSystemMessages(accountId)

  let query = supabase
    .from('predefined_messages')
    .select('*')
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (!includeSystem) {
    query = query.eq('type', 'custom')
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const savePredefinedMessage = async (accountId, payload) => {
  const record = {
    account_id: accountId,
    name: String(payload.name || '').trim(),
    body: String(payload.body || '').trim(),
    type: payload.type === 'system' ? 'system' : 'custom',
    key: payload.type === 'system' ? payload.key : null,
    sort_order: Number(payload.sort_order || 0),
    is_deletable: payload.type === 'system' ? false : true,
  }

  if (!record.name) throw new Error('El nombre del mensaje es obligatorio.')
  if (!record.body) throw new Error('El cuerpo del mensaje es obligatorio.')

  if (payload.id) {
    const { data, error } = await supabase
      .from('predefined_messages')
      .update(record)
      .eq('account_id', accountId)
      .eq('id', payload.id)
      .select('*')
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('predefined_messages')
    .insert(record)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export const deletePredefinedMessage = async (accountId, id) => {
  const { data: row, error: readError } = await supabase
    .from('predefined_messages')
    .select('id, is_deletable')
    .eq('account_id', accountId)
    .eq('id', id)
    .single()

  if (readError) throw readError
  if (!row?.is_deletable) {
    throw new Error('Los mensajes del sistema no se pueden eliminar.')
  }

  const { error } = await supabase
    .from('predefined_messages')
    .delete()
    .eq('account_id', accountId)
    .eq('id', id)

  if (error) throw error
}

export const reorderPredefinedMessages = async (accountId, orderedIds = []) => {
  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index]
    const { error } = await supabase
      .from('predefined_messages')
      .update({ sort_order: index + 1 })
      .eq('account_id', accountId)
      .eq('id', id)

    if (error) throw error
  }
}
