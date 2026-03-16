import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'

export const useGuestsStore = defineStore('guests', () => {
  const guests = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchGuests = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: supaError } = await supabase
        .from('guests')
        .select('*')
        .order('name', { ascending: true })

      if (supaError) throw supaError
      guests.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching guests:', err)
    } finally {
      loading.value = false
    }
  }

  const createGuest = async (guestData) => {
    loading.value = true
    error.value = null
    try {
      const payload = {
        ...guestData,
        document: guestData.document_number || null,
      }

      const { data, error: supaError } = await supabase
        .from('guests')
        .insert(payload)
        .select()
        .single()

      if (supaError) throw supaError
      await fetchGuests()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateGuest = async (id, guestData) => {
    loading.value = true
    error.value = null
    try {
      const payload = {
        ...guestData,
        document: guestData.document_number || null,
      }

      const { data, error: supaError } = await supabase
        .from('guests')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (supaError) throw supaError
      await fetchGuests()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteGuest = async (id) => {
    loading.value = true
    error.value = null
    try {
      const { count, error: relationError } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('guest_id', id)

      if (relationError) throw relationError

      if ((count || 0) > 0) {
        throw new Error('No se puede eliminar el huésped porque tiene reservas asociadas.')
      }

      const { error: supaError } = await supabase
        .from('guests')
        .delete()
        .eq('id', id)

      if (supaError) throw supaError
      await fetchGuests()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return { guests, loading, error, fetchGuests, createGuest, updateGuest, deleteGuest }
})