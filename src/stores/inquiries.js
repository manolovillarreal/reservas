import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'

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
  const inquiries = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchInquiries = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: supaError } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (supaError) throw supaError
      inquiries.value = data || []
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createInquiry = async (payload) => {
    const inquiryPayload = {
      guest_name: payload.guest_name || null,
      guest_phone: payload.guest_phone || null,
      check_in: normalizeDate(payload.check_in),
      check_out: normalizeDate(payload.check_out),
      guests_count: payload.guests_count ? Number(payload.guests_count) : null,
      source: payload.source || null,
      status: payload.status || 'new',
      notes: payload.notes || null
    }

    const { data, error: supaError } = await supabase
      .from('inquiries')
      .insert(inquiryPayload)
      .select()
      .single()

    if (supaError) throw supaError

    await fetchInquiries()
    return data
  }

  const updateInquiry = async (id, payload) => {
    const updatePayload = {
      ...payload,
      check_in: payload.check_in === undefined ? undefined : normalizeDate(payload.check_in),
      check_out: payload.check_out === undefined ? undefined : normalizeDate(payload.check_out)
    }

    const { data, error: supaError } = await supabase
      .from('inquiries')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (supaError) throw supaError

    await fetchInquiries()
    return data
  }

  const updateInquiryStatus = async (id, status) => {
    return updateInquiry(id, { status })
  }

  const deleteInquiry = async (id) => {
    const { error: supaError } = await supabase
      .from('inquiries')
      .delete()
      .eq('id', id)

    if (supaError) throw supaError

    await fetchInquiries()
  }

  const getInquiryById = async (id) => {
    const { data, error: supaError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .single()

    if (supaError) throw supaError
    return data
  }

  const createInquiryHold = async (payload) => {
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
