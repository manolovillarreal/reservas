import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import { useAccountStore } from './account'

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D+/g, '')
  return digits || ''
}

export const useGuestsStore = defineStore('guests', () => {
  const accountStore = useAccountStore()
  const guests = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchGuests = async () => {
    loading.value = true
    error.value = null
    try {
      const accountId = accountStore.getRequiredAccountId()
      const { data, error: supaError } = await supabase
        .from('guests')
        .select('*')
        .eq('account_id', accountId)
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
      const accountId = accountStore.getRequiredAccountId()
      const payload = {
        ...guestData,
        account_id: accountId,
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

  const getOrCreateGuestByPhone = async (guestData = {}) => {
    loading.value = true
    error.value = null

    try {
      const accountId = accountStore.getRequiredAccountId()
      const name = String(guestData.name || '').trim()
      const phone = String(guestData.phone || '').trim() || null
      const email = String(guestData.email || '').trim() || null
      const normalizedPhone = normalizePhone(phone)

      if (normalizedPhone) {
        const { data: existingGuests, error: existingError } = await supabase
          .from('guests')
          .select('id, name, phone, phone_country_code, email')
          .eq('account_id', accountId)
          .not('phone', 'is', null)

        if (existingError) throw existingError

        const matched = (existingGuests || []).find((guest) => normalizePhone(guest.phone) === normalizedPhone)
        if (matched) {
          return matched
        }
      }

      const fallbackName = name || phone || email
      if (!fallbackName) {
        return null
      }

      const created = await createGuest({
        ...guestData,
        name: fallbackName,
        phone,
        email,
      })

      return created
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
      const accountId = accountStore.getRequiredAccountId()
      const payload = {
        ...guestData,
        document: guestData.document_number || null,
      }

      const { data, error: supaError } = await supabase
        .from('guests')
        .update(payload)
        .eq('account_id', accountId)
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
      const accountId = accountStore.getRequiredAccountId()
      const { count, error: relationError } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('guest_id', id)

      if (relationError) throw relationError

      if ((count || 0) > 0) {
        throw new Error('No se puede eliminar el huésped porque tiene reservas asociadas.')
      }

      const { error: supaError } = await supabase
        .from('guests')
        .delete()
        .eq('account_id', accountId)
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

  return { guests, loading, error, fetchGuests, createGuest, getOrCreateGuestByPhone, updateGuest, deleteGuest }
})