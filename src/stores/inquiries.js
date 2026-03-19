import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from './account'
import { getSourceLabel } from '../utils/sourceUtils'

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

  const fetchInquiries = async () => {
    loading.value = true
    error.value = null
    try {
      const accountId = accountStore.getRequiredAccountId()
      const { data, error: supaError } = await supabase
        .from('inquiries')
        .select('*, source_type_info:source_types!inquiries_source_type_id_fkey(id, name, label_es, is_active), source_detail_info:source_details!inquiries_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })

      if (supaError) throw supaError
      inquiries.value = (data || []).map((item) => ({
        ...item,
        source_display_label: getSourceLabel(item)
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
    const inquiryPayload = {
      account_id: accountId,
      guest_name: payload.guest_name || null,
      guest_phone: payload.guest_phone || null,
      check_in: normalizeDate(payload.check_in),
      check_out: normalizeDate(payload.check_out),
      guests_count: payload.guests_count ? Number(payload.guests_count) : null,
      price_per_night: payload.price_per_night === '' || payload.price_per_night == null ? null : Number(payload.price_per_night),
      commission_name: payload.commission_name || null,
      commission_percentage: payload.commission_percentage === '' || payload.commission_percentage == null ? 0 : Number(payload.commission_percentage),
      discount_percentage: payload.discount_percentage === '' || payload.discount_percentage == null ? 0 : Number(payload.discount_percentage),
      source: payload.source || null,
      source_type_id: payload.source_type_id || null,
      source_detail_id: payload.source_detail_id || null,
      status: payload.status || 'new',
      notes: payload.notes || null
    }

    const { data, error: supaError } = await supabase
      .from('inquiries')
      .insert(inquiryPayload)
      .select('*, source_type_info:source_types!inquiries_source_type_id_fkey(id, name, label_es, is_active), source_detail_info:source_details!inquiries_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active)')
      .single()

    if (supaError) throw supaError

    await fetchInquiries()
    return data
  }

  const updateInquiry = async (id, payload) => {
    const accountId = accountStore.getRequiredAccountId()
    const updatePayload = {
      ...payload,
      check_in: payload.check_in === undefined ? undefined : normalizeDate(payload.check_in),
      check_out: payload.check_out === undefined ? undefined : normalizeDate(payload.check_out),
      price_per_night: payload.price_per_night === undefined ? undefined : (payload.price_per_night === '' || payload.price_per_night == null ? null : Number(payload.price_per_night)),
      commission_percentage: payload.commission_percentage === undefined ? undefined : (payload.commission_percentage === '' || payload.commission_percentage == null ? 0 : Number(payload.commission_percentage)),
      discount_percentage: payload.discount_percentage === undefined ? undefined : (payload.discount_percentage === '' || payload.discount_percentage == null ? 0 : Number(payload.discount_percentage))
    }

    const { data, error: supaError } = await supabase
      .from('inquiries')
      .update(updatePayload)
      .eq('account_id', accountId)
      .eq('id', id)
      .select('*, source_type_info:source_types!inquiries_source_type_id_fkey(id, name, label_es, is_active), source_detail_info:source_details!inquiries_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active)')
      .single()

    if (supaError) throw supaError

    await fetchInquiries()
    return data
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
      .select('*, source_type_info:source_types!inquiries_source_type_id_fkey(id, name, label_es, is_active), source_detail_info:source_details!inquiries_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active)')
      .eq('account_id', accountId)
      .eq('id', id)
      .single()

    if (supaError) throw supaError
    return {
      ...data,
      source_display_label: getSourceLabel(data)
    }
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
    createInquiryHold
  }
})
