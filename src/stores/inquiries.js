import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from './account'
import { getSourceLabel } from '../utils/sourceUtils'
import { generateInquiryNumber, generateUniqueReferenceCode } from '../utils/referenceUtils'
import { isValidInquiryTransition } from '../utils/inquiryUtils'
import { notifyNuevaConsulta } from '../services/notificationService'

const INQUIRY_SELECT = `
  *,
  source_type_info:source_types!inquiries_source_type_id_fkey(id, name, label_es, is_active),
  source_detail_info:source_details!inquiries_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active),
  reservation_info:reservations!inquiries_reservation_id_fkey(id, reservation_number),
  inquiry_units(unit_id)
`

const generateQuoteToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const normalizeDate = (value) => {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed
  }

  const asDate = new Date(value)
  if (Number.isNaN(asDate.getTime())) return null
  return asDate.toISOString().slice(0, 10)
}

export const useInquiriesStore = defineStore('inquiries', () => {
  const accountStore = useAccountStore()
  const inquiries = ref([])
  const loading = ref(false)
  const error = ref(null)

  const insertStatusLog = async ({ accountId, inquiryId, fromStatus = null, toStatus, note = null }) => {
    await supabase.from('inquiry_status_logs').insert({
      account_id: accountId,
      inquiry_id: inquiryId,
      from_status: fromStatus,
      to_status: toStatus,
      note
    })
  }

  const fetchInquiries = async () => {
    loading.value = true
    error.value = null
    try {
      const accountId = accountStore.getRequiredAccountId()
      const { data, error: supaError } = await supabase
        .from('inquiries')
        .select(INQUIRY_SELECT)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })

      if (supaError) throw supaError
      inquiries.value = (data || []).map((item) => ({
        ...item,
        source_display_label: getSourceLabel(item),
        unit_ids: (item.inquiry_units || []).map(u => u.unit_id)
      }))
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createInquiry = async (payload) => {
    const accountId = accountStore.getRequiredAccountId()
    const referenceCode = await generateUniqueReferenceCode(accountId)

    // Generate inquiry_number
    const yearMonth = (() => {
      const now = new Date()
      return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    })()
    const pattern = `INQ-${yearMonth}-%`
    const { data: prev } = await supabase
      .from('inquiries')
      .select('inquiry_number')
      .eq('account_id', accountId)
      .like('inquiry_number', pattern)
      .order('inquiry_number', { ascending: false })
      .limit(1)
    const inquiryNumber = generateInquiryNumber({ date: new Date(), previousInquiryNumber: prev?.[0]?.inquiry_number || null })

    const adults = payload.adults != null ? Number(payload.adults) : 1
    const children = payload.children != null ? Number(payload.children) : 0

    // Decide status: cotizada if quote_expires_at is set
    let status = payload.status || 'nueva'
    const shouldAutoQuote = !!payload.quote_expires_at && status === 'nueva'
    if (shouldAutoQuote) {
      status = 'cotizada'
    }

    const inquiryPayload = {
      account_id: accountId,
      inquiry_number: inquiryNumber,
      reference_code: referenceCode,
      guest_name: payload.guest_name || null,
      guest_phone: payload.guest_phone || null,
      check_in: normalizeDate(payload.check_in),
      check_out: normalizeDate(payload.check_out),
      adults,
      children,
      guests_count: adults + children,
      price_per_night: payload.price_per_night === '' || payload.price_per_night == null ? null : Number(payload.price_per_night),
      commission_name: payload.commission_name || null,
      commission_percentage: payload.commission_percentage === '' || payload.commission_percentage == null ? 0 : Number(payload.commission_percentage),
      discount_percentage: payload.discount_percentage === '' || payload.discount_percentage == null ? 0 : Number(payload.discount_percentage),
      quote_expires_at: payload.quote_expires_at ? new Date(payload.quote_expires_at).toISOString() : null,
      source: payload.source || null,
      source_type_id: payload.source_type_id || null,
      source_detail_id: payload.source_detail_id || null,
      status,
      notes: payload.notes || null,
      quote_token: generateQuoteToken()
    }

    const { data, error: supaError } = await supabase
      .from('inquiries')
      .insert(inquiryPayload)
      .select(INQUIRY_SELECT)
      .single()

    if (supaError) throw supaError

    // Save unit associations
    const unitIds = Array.isArray(payload.unit_ids) ? payload.unit_ids : []
    if (unitIds.length > 0) {
      await supabase.from('inquiry_units').insert(
        unitIds.map(uid => ({ account_id: accountId, inquiry_id: data.id, unit_id: uid }))
      )
    }

    // Track status flow for audit. If auto-quoted, register the intermediate 'contactada'.
    if (shouldAutoQuote) {
      await insertStatusLog({
        accountId,
        inquiryId: data.id,
        fromStatus: 'nueva',
        toStatus: 'contactada',
        note: 'Paso automático al generar cotización.'
      })
      await insertStatusLog({
        accountId,
        inquiryId: data.id,
        fromStatus: 'contactada',
        toStatus: 'cotizada',
        note: 'Cotización creada automáticamente por vencimiento definido.'
      })
    } else {
      await insertStatusLog({
        accountId,
        inquiryId: data.id,
        fromStatus: null,
        toStatus: status,
        note: 'Creación inicial.'
      })
    }

    const createdInquiry = await getInquiryById(data.id)
    await fetchInquiries()
    try { await notifyNuevaConsulta(accountId, createdInquiry) } catch (e) { /* silencioso */ }
    return createdInquiry
  }

  const updateInquiry = async (id, payload) => {
    const accountId = accountStore.getRequiredAccountId()

    const { data: existing, error: existingError } = await supabase
      .from('inquiries')
      .select('id, status')
      .eq('account_id', accountId)
      .eq('id', id)
      .single()

    if (existingError) throw existingError

    // Decide status auto-promotion if quote_expires_at is being set
    let statusOverride = payload.status
    if (payload.quote_expires_at && !payload.status && existing.status === 'nueva') {
      statusOverride = 'cotizada'
    }

    if (statusOverride && statusOverride !== existing.status && !isValidInquiryTransition(existing.status, statusOverride)) {
      throw new Error(`Transición de estado inválida: ${existing.status} → ${statusOverride}.`)
    }

    const updatePayload = {
      ...(payload.guest_name !== undefined && { guest_name: payload.guest_name || null }),
      ...(payload.guest_phone !== undefined && { guest_phone: payload.guest_phone || null }),
      ...(payload.check_in !== undefined && { check_in: normalizeDate(payload.check_in) }),
      ...(payload.check_out !== undefined && { check_out: normalizeDate(payload.check_out) }),
      ...(payload.adults !== undefined && { adults: Number(payload.adults || 1) }),
      ...(payload.children !== undefined && { children: Number(payload.children || 0) }),
      ...(payload.price_per_night !== undefined && {
        price_per_night: payload.price_per_night === '' || payload.price_per_night == null ? null : Number(payload.price_per_night)
      }),
      ...(payload.commission_name !== undefined && { commission_name: payload.commission_name || null }),
      ...(payload.commission_percentage !== undefined && {
        commission_percentage: payload.commission_percentage === '' || payload.commission_percentage == null ? 0 : Number(payload.commission_percentage)
      }),
      ...(payload.discount_percentage !== undefined && {
        discount_percentage: payload.discount_percentage === '' || payload.discount_percentage == null ? 0 : Number(payload.discount_percentage)
      }),
      ...(payload.quote_expires_at !== undefined && {
        quote_expires_at: payload.quote_expires_at ? new Date(payload.quote_expires_at).toISOString() : null
      }),
      ...(payload.source !== undefined && { source: payload.source || null }),
      ...(payload.source_type_id !== undefined && { source_type_id: payload.source_type_id || null }),
      ...(payload.source_detail_id !== undefined && { source_detail_id: payload.source_detail_id || null }),
      ...(payload.reference_code !== undefined && { reference_code: payload.reference_code || null }),
      ...(payload.notes !== undefined && { notes: payload.notes || null }),
      ...(statusOverride !== undefined && { status: statusOverride }),
      ...(payload.reservation_id !== undefined && { reservation_id: payload.reservation_id || null })
    }

    const { data, error: supaError } = await supabase
      .from('inquiries')
      .update(updatePayload)
      .eq('account_id', accountId)
      .eq('id', id)
      .select(INQUIRY_SELECT)
      .single()

    if (supaError) throw supaError

    // Sync unit associations if provided
    if (Array.isArray(payload.unit_ids)) {
      await supabase.from('inquiry_units').delete().eq('account_id', accountId).eq('inquiry_id', id)
      if (payload.unit_ids.length > 0) {
        await supabase.from('inquiry_units').insert(
          payload.unit_ids.map(uid => ({ account_id: accountId, inquiry_id: id, unit_id: uid }))
        )
      }
    }

    if (statusOverride && statusOverride !== existing.status) {
      if (statusOverride === 'cotizada' && existing.status === 'nueva') {
        await insertStatusLog({
          accountId,
          inquiryId: id,
          fromStatus: 'nueva',
          toStatus: 'contactada',
          note: 'Paso automático previo a cotizada.'
        })
        await insertStatusLog({
          accountId,
          inquiryId: id,
          fromStatus: 'contactada',
          toStatus: 'cotizada',
          note: payload.quote_expires_at ? 'Cotización generada con fecha de vencimiento.' : 'Cambio de estado.'
        })
      } else {
        await insertStatusLog({
          accountId,
          inquiryId: id,
          fromStatus: existing.status,
          toStatus: statusOverride,
          note: 'Cambio manual de estado.'
        })
      }
    }

    const updatedInquiry = await getInquiryById(id)
    await fetchInquiries()
    return updatedInquiry
  }

  const updateInquiryStatus = async (id, status) => {
    return updateInquiry(id, { status })
  }

  const deleteInquiry = async (id) => {
    const accountId = accountStore.getRequiredAccountId()
    const { error: supaError } = await supabase
      .from('inquiries')
      .delete()
      .eq('account_id', accountId)
      .eq('id', id)

    if (supaError) throw supaError

    await fetchInquiries()
  }

  const getInquiryById = async (id) => {
    const accountId = accountStore.getRequiredAccountId()
    const { data, error: supaError } = await supabase
      .from('inquiries')
      .select(INQUIRY_SELECT)
      .eq('account_id', accountId)
      .eq('id', id)
      .single()

    if (supaError) throw supaError
    return {
      ...data,
      source_display_label: getSourceLabel(data),
      unit_ids: (data.inquiry_units || []).map(u => u.unit_id)
    }
  }

  const generateInquiryQuoteToken = async (id) => {
    const accountId = accountStore.getRequiredAccountId()
    const token = generateQuoteToken()
    const { error: supaError } = await supabase
      .from('inquiries')
      .update({ quote_token: token })
      .eq('account_id', accountId)
      .eq('id', id)

    if (supaError) throw supaError
    return token
  }

  const createInquiryHold = async (payload) => {
    const accountId = accountStore.getRequiredAccountId()
    const inquiryId = payload.inquiry_id
    const unitId = payload.unit_id
    const startDate = normalizeDate(payload.start_date)
    const endDate = normalizeDate(payload.end_date)
    const expiresAt = payload.expires_at ? new Date(payload.expires_at) : null

    if (!inquiryId) throw new Error('La consulta es obligatoria para generar un bloqueo.')
    if (!unitId) throw new Error('Debes seleccionar una unidad.')
    if (!startDate || !endDate) throw new Error('Debes completar fecha de inicio y fecha de fin.')
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio.')
    }

    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
      throw new Error('Debes indicar una fecha de vencimiento válida.')
    }

    if (expiresAt <= new Date()) {
      throw new Error('La fecha de vencimiento debe ser posterior al momento actual.')
    }

    const { data: conflicts, error: conflictError } = await supabase
      .from('occupancies')
      .select('id')
      .eq('account_id', accountId)
      .eq('unit_id', unitId)
      .lt('start_date', endDate)
      .gt('end_date', startDate)
      .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')
      .limit(1)

    if (conflictError) throw conflictError

    if ((conflicts || []).length > 0) {
      throw new Error('La unidad ya está ocupada o bloqueada en ese rango de fechas.')
    }

    const { data, error: supaError } = await supabase
      .from('occupancies')
      .insert({
        account_id: accountId,
        unit_id: unitId,
        start_date: startDate,
        end_date: endDate,
        occupancy_type: 'inquiry_hold',
        inquiry_id: inquiryId,
        expires_at: expiresAt.toISOString(),
        notes: payload.notes || null
      })
      .select()
      .single()

    if (supaError) throw supaError
    return data
  }

  return {
    inquiries,
    loading,
    error,
    fetchInquiries,
    createInquiry,
    updateInquiry,
    updateInquiryStatus,
    deleteInquiry,
    getInquiryById,
    createInquiryHold,
    generateInquiryQuoteToken
  }
})
