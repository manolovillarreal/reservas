import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'

export const useUnitsStore = defineStore('units', () => {
  const units = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchUnits = async (venueId = null) => {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('units')
        .select('*, venues(name)')
        .order('name', { ascending: true })

      if (venueId) {
        query = query.eq('venue_id', venueId)
      }

      const { data, error: supaError } = await query

      if (supaError) throw supaError
      units.value = data || []
    } catch (err) {
      error.value = err.message
      console.error('Error fetching units:', err)
    } finally {
      loading.value = false
    }
  }

  const createUnit = async (unitData) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: supaError } = await supabase
        .from('units')
        .insert(unitData)
        .select()
        .single()

      if (supaError) throw supaError
      await fetchUnits()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUnit = async (id, unitData) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: supaError } = await supabase
        .from('units')
        .update(unitData)
        .eq('id', id)
        .select()
        .single()

      if (supaError) throw supaError
      await fetchUnits()
      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteUnit = async (id) => {
    loading.value = true
    error.value = null
    try {
      const { count, error: relationError } = await supabase
        .from('reservation_units')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', id)

      if (relationError) throw relationError

      if ((count || 0) > 0) {
        throw new Error('No se puede eliminar la unidad porque tiene reservas asociadas.')
      }

      const { error: supaError } = await supabase
        .from('units')
        .delete()
        .eq('id', id)

      if (supaError) throw supaError
      await fetchUnits()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return { units, loading, error, fetchUnits, createUnit, updateUnit, deleteUnit }
})