import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from './account'

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

export const useRoomBlocksStore = defineStore('roomBlocks', () => {
  const accountStore = useAccountStore()
  const roomBlocks = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchRoomBlocks = async () => {
    loading.value = true
    error.value = null

    try {
      const accountId = accountStore.getRequiredAccountId()
      const { data, error: supaError } = await supabase
        .from('occupancies')
        .select('*, units(name, venue_id, venues(name))')
        .eq('account_id', accountId)
        .neq('occupancy_type', 'reservation')
        .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')
        .order('start_date', { ascending: true })

      if (supaError) throw supaError
      roomBlocks.value = (data || []).map(row => {
        const notes = row.notes || ''
        const [reasonLine, ...extra] = notes.split('\n')

        return {
          ...row,
          reason: reasonLine || row.occupancy_type,
          notes: extra.join('\n') || null
        }
      })
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createRoomBlock = async (payload) => {
    const accountId = accountStore.getRequiredAccountId()
    const startDate = normalizeDate(payload.start_date)
    const endDate = normalizeDate(payload.end_date)

    if (!startDate || !endDate) {
      throw new Error('Debes completar fecha de inicio y fecha de fin.')
    }

    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio.')
    }

    const { data, error: supaError } = await supabase
      .from('occupancies')
      .insert({
        account_id: accountId,
        unit_id: payload.unit_id,
        start_date: startDate,
        end_date: endDate,
        occupancy_type: payload.occupancy_type || 'maintenance',
        notes: payload.reason ? `${payload.reason}${payload.notes ? `\n${payload.notes}` : ''}` : (payload.notes || null),
        expires_at: payload.expires_at || null
      })
      .select()
      .single()

    if (supaError) throw supaError

    await fetchRoomBlocks()
    return data
  }

  const updateRoomBlock = async (id, payload) => {
    const accountId = accountStore.getRequiredAccountId()
    const mergedNotes = payload.reason ? `${payload.reason}${payload.notes ? `\n${payload.notes}` : ''}` : payload.notes

    const updatePayload = {
      occupancy_type: payload.occupancy_type,
      notes: mergedNotes,
      start_date: payload.start_date === undefined ? undefined : normalizeDate(payload.start_date),
      end_date: payload.end_date === undefined ? undefined : normalizeDate(payload.end_date)
    }

    if (updatePayload.start_date && updatePayload.end_date && new Date(updatePayload.start_date) >= new Date(updatePayload.end_date)) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio.')
    }

    const { data, error: supaError } = await supabase
      .from('occupancies')
      .update(updatePayload)
      .eq('account_id', accountId)
      .eq('id', id)
      .select()
      .single()

    if (supaError) throw supaError

    await fetchRoomBlocks()
    return data
  }

  const deleteRoomBlock = async (id) => {
    const accountId = accountStore.getRequiredAccountId()
    const { error: supaError } = await supabase
      .from('occupancies')
      .delete()
      .eq('account_id', accountId)
      .eq('id', id)

    if (supaError) throw supaError

    await fetchRoomBlocks()
  }

  return {
    roomBlocks,
    loading,
    error,
    fetchRoomBlocks,
    createRoomBlock,
    updateRoomBlock,
    deleteRoomBlock
  }
})
