import { supabase } from './supabase'

export const normalizeSourceName = (value) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'canal'
}

const buildSourceDetailPayload = (accountId, data) => {
  const label = String(data.label_es || data.name || '').trim()
  if (!accountId) throw new Error('accountId es obligatorio.')
  if (!data.source_type_id) throw new Error('source_type_id es obligatorio.')
  if (!label) throw new Error('Debes indicar un nombre para el canal.')

  return {
    account_id: accountId,
    source_type_id: data.source_type_id,
    name: normalizeSourceName(data.name || label),
    label_es: label,
    suggested_commission_percentage: Number(data.suggested_commission_percentage || 0),
    suggested_discount_percentage: Number(data.suggested_discount_percentage || 0),
    is_active: data.is_active ?? true,
  }
}

export const getSourceTypes = async (accountId, options = {}) => {
  const includeInactive = options.includeInactive === true

  let query = supabase
    .from('source_types')
    .select('*')
    .eq('account_id', accountId)
    .order('label_es', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const getSourceDetails = async (accountId, sourceTypeId = null, options = {}) => {
  const includeInactive = options.includeInactive === true

  let query = supabase
    .from('source_details')
    .select('*, source_type:source_types!source_details_source_type_id_fkey(id, name, label_es, is_active)')
    .eq('account_id', accountId)
    .order('label_es', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  if (sourceTypeId) {
    query = query.eq('source_type_id', sourceTypeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const createSourceDetail = async (accountId, data) => {
  const payload = buildSourceDetailPayload(accountId, data)

  const { data: created, error } = await supabase
    .from('source_details')
    .insert(payload)
    .select('*, source_type:source_types!source_details_source_type_id_fkey(id, name, label_es, is_active)')
    .single()

  if (error) throw error
  return created
}

export const updateSourceDetail = async (accountId, detailId, data) => {
  const updatePayload = {}

  if (data.label_es !== undefined) {
    const label = String(data.label_es || '').trim()
    if (!label) throw new Error('El canal debe tener un nombre.')
    updatePayload.label_es = label
  }

  if (data.name !== undefined) {
    updatePayload.name = normalizeSourceName(data.name)
  }

  if (data.suggested_commission_percentage !== undefined) {
    updatePayload.suggested_commission_percentage = Number(data.suggested_commission_percentage || 0)
  }

  if (data.suggested_discount_percentage !== undefined) {
    updatePayload.suggested_discount_percentage = Number(data.suggested_discount_percentage || 0)
  }

  if (data.is_active !== undefined) {
    updatePayload.is_active = Boolean(data.is_active)
  }

  const { data: updated, error } = await supabase
    .from('source_details')
    .update(updatePayload)
    .eq('account_id', accountId)
    .eq('id', detailId)
    .select('*, source_type:source_types!source_details_source_type_id_fkey(id, name, label_es, is_active)')
    .single()

  if (error) throw error
  return updated
}

export const setSourceTypeActive = async (accountId, sourceTypeId, isActive) => {
  const { data, error } = await supabase
    .from('source_types')
    .update({ is_active: isActive })
    .eq('account_id', accountId)
    .eq('id', sourceTypeId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export const setSourceDetailActive = async (accountId, sourceDetailId, isActive) => {
  const { data, error } = await supabase
    .from('source_details')
    .update({ is_active: isActive })
    .eq('account_id', accountId)
    .eq('id', sourceDetailId)
    .select('*, source_type:source_types!source_details_source_type_id_fkey(id, name, label_es, is_active)')
    .single()

  if (error) throw error
  return data
}

export const deleteSourceDetail = async (accountId, sourceDetailId) => {
  const [{ count: reservationCount, error: reservationError }, { count: inquiryCount, error: inquiryError }] = await Promise.all([
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('source_detail_id', sourceDetailId),
    supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('source_detail_id', sourceDetailId),
  ])

  if (reservationError) throw reservationError
  if (inquiryError) throw inquiryError

  if (Number(reservationCount || 0) > 0 || Number(inquiryCount || 0) > 0) {
    throw new Error('No se puede eliminar este canal porque ya tiene registros asociados.')
  }

  const { error } = await supabase
    .from('source_details')
    .delete()
    .eq('account_id', accountId)
    .eq('id', sourceDetailId)

  if (error) throw error
}

// ─── System / global source functions ────────────────────────────────────────

// Fixed display order for the 4 global types
const TYPE_ORDER = ['direct', 'ota', 'social', 'referral']

export const getGlobalSourceTypes = async () => {
  const { data, error } = await supabase
    .from('source_types')
    .select('id, name, label_es, is_active')
    .is('account_id', null)
    .order('label_es', { ascending: true })

  if (error) throw error
  return (data || []).sort((a, b) => TYPE_ORDER.indexOf(a.name) - TYPE_ORDER.indexOf(b.name))
}

export const getSystemSourceDetails = async (accountId) => {
  const [{ data: systemDetails, error: systemError }, { data: customDetails, error: customError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase
        .from('source_details')
        .select('*, source_type:source_types!source_details_source_type_id_fkey(id, name, label_es)')
        .is('account_id', null)
        .order('sort_order', { ascending: true }),
      supabase
        .from('source_details')
        .select('*, source_type:source_types!source_details_source_type_id_fkey(id, name, label_es)')
        .eq('account_id', accountId)
        .eq('is_system', false)
        .order('label_es', { ascending: true }),
      supabase
        .from('account_source_settings')
        .select('source_detail_id, is_active, commission_pct')
        .eq('account_id', accountId),
    ])

  if (systemError) throw systemError
  if (customError) throw customError
  if (settingsError) throw settingsError

  const settingsMap = {}
  for (const s of settings || []) {
    settingsMap[s.source_detail_id] = s
  }

  const allDetails = [...(systemDetails || []), ...(customDetails || [])].map((d) => {
    const override = settingsMap[d.id]
    return {
      ...d,
      is_active: override ? override.is_active : true,
      commission_pct: override ? Number(override.commission_pct) : Number(d.suggested_commission_percentage || 0),
    }
  })

  // Group by source_type, preserving TYPE_ORDER
  const typeMap = {}
  for (const d of allDetails) {
    const typeName = d.source_type?.name || 'unknown'
    if (!typeMap[typeName]) {
      typeMap[typeName] = { type: d.source_type, details: [] }
    }
    typeMap[typeName].details.push(d)
  }

  return TYPE_ORDER.filter((n) => typeMap[n]).map((n) => typeMap[n])
}

export const saveSourceSettings = async (accountId, sourceDetailId, { is_active, commission_pct }) => {
  const { error } = await supabase
    .from('account_source_settings')
    .upsert(
      { account_id: accountId, source_detail_id: sourceDetailId, is_active, commission_pct: Number(commission_pct ?? 0) },
      { onConflict: 'account_id,source_detail_id' }
    )

  if (error) throw error
}

export const createCustomSource = async (accountId, sourceTypeId, label_es, commissionPct = 0) => {
  const label = String(label_es || '').trim()
  if (!label) throw new Error('El nombre del canal es obligatorio.')

  const { data: created, error: insertError } = await supabase
    .from('source_details')
    .insert({
      account_id: accountId,
      source_type_id: sourceTypeId,
      name: normalizeSourceName(label),
      label_es: label,
      is_system: false,
      is_other: false,
      suggested_commission_percentage: Number(commissionPct || 0),
      suggested_discount_percentage: 0,
      is_active: true,
    })
    .select('*, source_type:source_types!source_details_source_type_id_fkey(id, name, label_es)')
    .single()

  if (insertError) throw insertError

  await saveSourceSettings(accountId, created.id, { is_active: true, commission_pct: Number(commissionPct || 0) })

  return { ...created, is_active: true, commission_pct: Number(commissionPct || 0) }
}