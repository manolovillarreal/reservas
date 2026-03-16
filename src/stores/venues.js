import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'

export const useVenuesStore = defineStore('venues', () => {
  const venues = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchVenues = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: supaError } = await supabase
        .from('venues')
        .select('*')
        .order('name', { ascending: true })

      if (supaError) throw supaError
      venues.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching venues:', err)
    } finally {
      loading.value = false
    }
  }

  const createVenue = async (venueData) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: supaError } = await supabase
        .from('venues')
        .insert(venueData)
        .select()
        .single()

      if (supaError) throw supaError
      await fetchVenues()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateVenue = async (id, venueData) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: supaError } = await supabase
        .from('venues')
        .update(venueData)
        .eq('id', id)
        .select()
        .single()

      if (supaError) throw supaError
      await fetchVenues()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteVenue = async (id) => {
    loading.value = true
    error.value = null
    try {
      const { data: venueUnits, error: unitsError } = await supabase
        .from('units')
        .select('id', { count: 'exact' })
        .eq('venue_id', id)

      if (unitsError) throw unitsError

      const unitIds = (venueUnits || []).map(unit => unit.id)

      const { count: reservationsCount, error: reservationsError } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', id)

      if (reservationsError) throw reservationsError

      if ((reservationsCount || 0) > 0) {
        throw new Error('No se puede eliminar la sede porque tiene reservas asociadas.')
      }

      if (unitIds.length > 0) {
        const { count: reservationUnitsCount, error: reservationUnitsError } = await supabase
          .from('reservation_units')
          .select('id', { count: 'exact', head: true })
          .in('unit_id', unitIds)

        if (reservationUnitsError) throw reservationUnitsError

        if ((reservationUnitsCount || 0) > 0) {
          throw new Error('No se puede eliminar la sede porque una o más unidades tienen historial de reservas.')
        }
      }

      const { error: supaError } = await supabase
        .from('venues')
        .delete()
        .eq('id', id)

      if (supaError) throw supaError
      await fetchVenues()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return { venues, loading, error, fetchVenues, createVenue, updateVenue, deleteVenue }
})