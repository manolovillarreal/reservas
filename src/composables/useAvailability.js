import { ref } from 'vue'
import { supabase } from '../services/supabase'

/**
 * checkAvailability — query units + occupancies to determine availability.
 *
 * Returns:
 *   available   — units with no occupancy overlap AND capacity >= personas
 *   unavailable — units that have overlapping occupancies
 *   singleVenue — true when all available units share the same venue (for UI simplification)
 */
export function useAvailability() {
  const loading = ref(false)
  const error = ref(null)
  const available = ref([])
  const unavailable = ref([])
  const singleVenue = ref(false)
  const checked = ref(false)

  const checkAvailability = async ({ accountId, checkIn, checkOut, personas = 1 }) => {
    if (!accountId || !checkIn || !checkOut) return

    loading.value = true
    error.value = null
    available.value = []
    unavailable.value = []
    singleVenue.value = false
    checked.value = false

    try {
      // 1. Fetch all active units for the account, eagerly joining their venue
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, name, capacity, venue_id, price_base, price_min, price_extra_person, venues(id, name)')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (unitsError) throw unitsError

      const allUnits = unitsData || []

      if (allUnits.length === 0) {
        checked.value = true
        return
      }

      // 2. Find occupancies that overlap with the requested range.
      //    Overlap condition: start_date < checkOut AND end_date > checkIn
      //    Exclude expired inquiry_holds.
      const unitIds = allUnits.map((u) => u.id)
      const { data: occsData, error: occsError } = await supabase
        .from('occupancies')
        .select('unit_id')
        .eq('account_id', accountId)
        .in('unit_id', unitIds)
        .lt('start_date', checkOut)
        .gt('end_date', checkIn)
        .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')

      if (occsError) throw occsError

      const occupiedUnitIds = new Set((occsData || []).map((o) => o.unit_id))

      // 3. Split units into available / unavailable, applying capacity filter
      const avail = []
      const unavail = []
      for (const unit of allUnits) {
        if (occupiedUnitIds.has(unit.id)) {
          unavail.push(unit)
        } else if ((unit.capacity || 2) >= personas) {
          avail.push(unit)
        }
      }

      available.value = avail
      unavailable.value = unavail

      // 4. Determine if all available units share one venue (for UI: hide venue column)
      const venueIds = new Set(avail.map((u) => u.venue_id))
      singleVenue.value = venueIds.size <= 1
      checked.value = true
    } catch (err) {
      error.value = err.message || 'Error al verificar disponibilidad.'
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    available.value = []
    unavailable.value = []
    singleVenue.value = false
    checked.value = false
    error.value = null
    loading.value = false
  }

  return { loading, error, available, unavailable, singleVenue, checked, checkAvailability, reset }
}
