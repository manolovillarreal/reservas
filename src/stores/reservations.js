import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabase'
import {
  getCommissionAmount,
  getNetAmount,
  getReservationGuestName,
  getReservationGuestPhone,
  getBalanceAmount,
  getGuestsTotal
} from '../utils/reservationUtils'
import { getNextReservationNumber, syncReservationOccupancy } from '../services/reservationService'

const normalizeDate = (value) => {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    return trimmed.slice(0, 10)
  }

  const asDate = new Date(value)
  if (Number.isNaN(asDate.getTime())) return null
  return asDate.toISOString().slice(0, 10)
}

const getDaysDifference = (checkIn, checkOut) => {
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  return Math.ceil(Math.abs(outDate - inDate) / (1000 * 60 * 60 * 24))
}

export const useReservationsStore = defineStore('reservations', () => {
  const reservations = ref([])
  const loading = ref(false)
  const error = ref(null)
  const lastOccupancySyncIssue = ref(null)

  const fetchReservations = async () => {
    loading.value = true
    error.value = null

    try {
      const { data, error: supaError } = await supabase
        .from('reservations')
        .select(`
          *,
          guests!reservations_guest_id_fkey(name, phone, email, nationality, document_type, document_number),
          venues(name),
          reservation_units(unit_id, units(name, venue_id)),
          reservation_guests(is_primary, guest_id, guests!reservation_guests_guest_id_fkey(*)),
          payments(amount)
        `)
        .order('check_in', { ascending: true })

      if (supaError) throw supaError

      reservations.value = (data || []).map(res => {
        const totalPayments = (res.payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
        const unitNames = (res.reservation_units || [])
          .map(ru => ru.units?.name)
          .filter(Boolean)

        const paidAmount = Number(res.paid_amount || totalPayments || 0)

        return {
          ...res,
          paid_amount: paidAmount,
          guest_display_name: getReservationGuestName(res),
          guest_display_phone: getReservationGuestPhone(res),
          unit_names: unitNames,
          unit_names_display: unitNames.join(', '),
          commission_amount: getCommissionAmount(res),
          net_amount: getNetAmount(res),
          guests_total: getGuestsTotal(res),
          nights: getDaysDifference(res.check_in, res.check_out),
          balance: getBalanceAmount({ ...res, paid_amount: paidAmount })
        }
      })
    } catch (err) {
      error.value = err.message
      console.error('Error fetching reservations:', err)
    } finally {
      loading.value = false
    }
  }

  const getUnitAvailability = async (unitIds, checkIn, checkOut, excludeReservationId = null) => {
    try {
      const normalizedCheckIn = normalizeDate(checkIn)
      const normalizedCheckOut = normalizeDate(checkOut)

      if (!normalizedCheckIn || !normalizedCheckOut || unitIds.length === 0) {
        return {
          unavailableUnitIds: [],
          occupancyConflicts: []
        }
      }

      let query = supabase
        .from('occupancies')
        .select('id, unit_id, start_date, end_date, occupancy_type, reservation_id, notes')
        .in('unit_id', unitIds)
        .lt('start_date', normalizedCheckOut)
        .gt('end_date', normalizedCheckIn)
        .or('occupancy_type.neq.inquiry_hold,expires_at.gt.now()')

      if (excludeReservationId) {
        query = query.or(`reservation_id.is.null,reservation_id.neq.${excludeReservationId}`)
      }

      const { data, error: supaError } = await query
      if (supaError) throw supaError

      const unavailableUnitIds = [...new Set((data || []).map(conflict => conflict.unit_id))]

      return {
        unavailableUnitIds,
        occupancyConflicts: data || []
      }
    } catch (err) {
      throw new Error('Error al validar disponibilidad: ' + err.message)
    }
  }

  const checkOverlap = async (unitIds, checkIn, checkOut, excludeReservationId = null) => {
    const availability = await getUnitAvailability(unitIds, checkIn, checkOut, excludeReservationId)
    return availability.unavailableUnitIds.length > 0
  }

  const trySyncReservationOccupancy = async (reservationId, retryCount = 0) => {
    try {
      await syncReservationOccupancy(reservationId)
      lastOccupancySyncIssue.value = null
      return { synced: true }
    } catch (syncError) {
      if (retryCount < 1) {
        return trySyncReservationOccupancy(reservationId, retryCount + 1)
      }

      lastOccupancySyncIssue.value = {
        reservationId,
        message: syncError.message,
        retryAvailable: false
      }

      return {
        synced: false,
        error: syncError.message
      }
    }
  }

  const retryReservationOccupancySync = async (reservationId) => {
    const result = await trySyncReservationOccupancy(reservationId, 0)
    return result
  }

  const createReservation = async (reservationData) => {
    loading.value = true
    error.value = null

    try {
      const unitIds = reservationData.unit_ids || []
      const normalizedCheckIn = normalizeDate(reservationData.check_in)
      const normalizedCheckOut = normalizeDate(reservationData.check_out)

      if (!normalizedCheckIn || !normalizedCheckOut) {
        throw new Error('Debes completar Check-in y Check-out con fechas válidas.')
      }

      if (new Date(normalizedCheckIn) >= new Date(normalizedCheckOut)) {
        throw new Error('El Check-out debe ser posterior al Check-in.')
      }

      if (unitIds.length === 0) {
        throw new Error('Debe seleccionar al menos una unidad.')
      }

      const overlap = await checkOverlap(unitIds, normalizedCheckIn, normalizedCheckOut)
      if (overlap) {
        throw new Error('Las fechas seleccionadas se solapan con una ocupación existente.')
      }

      const reservationNumber = await getNextReservationNumber()
      const adults = Number(reservationData.adults || 1)
      const children = Number(reservationData.children || 0)
      const nights = getDaysDifference(normalizedCheckIn, normalizedCheckOut)
      const pricePerNight = Number(reservationData.price_per_night || 0)
      const totalAmount = Number(reservationData.total_amount || (pricePerNight * nights) || 0)

      const reservationPayload = {
        reservation_number: reservationNumber,
        venue_id: reservationData.venue_id,
        guest_id: reservationData.guest_id || null,
        guest_name: reservationData.guest_name || null,
        guest_phone: reservationData.guest_phone || null,
        adults,
        children,
        check_in: normalizedCheckIn,
        check_out: normalizedCheckOut,
        price_per_night: pricePerNight || null,
        total_amount: totalAmount,
        paid_amount: Number(reservationData.paid_amount || 0),
        commission_name: reservationData.commission_name || null,
        commission_percentage: reservationData.commission_percentage || null,
        status: reservationData.status || 'confirmed',
        source: reservationData.source || null,
        payment_deadline: null,
        notes: reservationData.notes || null
      }

      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert(reservationPayload)
        .select()
        .single()

      if (insertError) throw insertError

      const reservationUnitsPayload = unitIds.map(unitId => ({
        reservation_id: data.id,
        unit_id: unitId
      }))

      const { error: reservationUnitsError } = await supabase
        .from('reservation_units')
        .insert(reservationUnitsPayload)

      if (reservationUnitsError) throw reservationUnitsError

      await supabase.from('reservation_status_logs').insert({
        reservation_id: data.id,
        new_status: data.status,
        notes: 'Creación inicial'
      })

      if (reservationData.inquiry_id) {
        await supabase
          .from('inquiries')
          .update({
            status: 'converted',
            notes: reservationData.inquiry_conversion_note || 'Convertida manualmente a reserva.'
          })
          .eq('id', reservationData.inquiry_id)
      }

      const syncResult = await trySyncReservationOccupancy(data.id)

      await fetchReservations()

      return {
        ...data,
        syncResult
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    reservations,
    loading,
    error,
    lastOccupancySyncIssue,
    fetchReservations,
    createReservation,
    checkOverlap,
    getUnitAvailability,
    retryReservationOccupancySync
  }
})
