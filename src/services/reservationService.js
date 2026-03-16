import { supabase } from './supabase'
import { generateReservationNumber } from '../utils/reservationUtils'

const normalizeDate = (value) => {
  if (!value) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return trimmed.slice(0, 10)
}

const currentYearMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const getNextReservationNumber = async () => {
  const yearMonth = currentYearMonth()
  const pattern = `RES-${yearMonth}-%`

  const { data, error } = await supabase
    .from('reservations')
    .select('reservation_number')
    .like('reservation_number', pattern)
    .order('reservation_number', { ascending: false })
    .limit(1)

  if (error) throw error

  const previousReservationNumber = data?.[0]?.reservation_number || null
  return generateReservationNumber({ date: new Date(), previousReservationNumber })
}

const getReservationUnits = async (reservationId) => {
  const { data, error } = await supabase
    .from('reservation_units')
    .select('unit_id')
    .eq('reservation_id', reservationId)

  if (error) throw error
  return (data || []).map(row => row.unit_id)
}

export const syncReservationOccupancy = async (reservationId) => {
  if (!reservationId) {
    throw new Error('reservationId es obligatorio para sincronizar ocupación.')
  }

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .select('id, status, check_in, check_out')
    .eq('id', reservationId)
    .single()

  if (reservationError) throw reservationError

  const unitIds = await getReservationUnits(reservationId)

  if (!reservation || unitIds.length === 0) {
    throw new Error('La reserva no tiene unidades asociadas para sincronizar ocupación.')
  }

  if (reservation.status === 'cancelled') {
    const { error: deleteError } = await supabase
      .from('occupancies')
      .delete()
      .eq('reservation_id', reservationId)
      .eq('occupancy_type', 'reservation')

    if (deleteError) throw deleteError

    return { deleted: true, reservationId }
  }

  const startDate = normalizeDate(reservation.check_in)
  const endDate = normalizeDate(reservation.check_out)

  if (!startDate || !endDate) {
    throw new Error('La reserva no tiene fechas válidas para sincronizar ocupación.')
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('occupancies')
    .select('id, unit_id')
    .eq('reservation_id', reservationId)
    .eq('occupancy_type', 'reservation')

  if (existingError) throw existingError

  const existingByUnit = new Map((existingRows || []).map(row => [row.unit_id, row]))

  for (const unitId of unitIds) {
    const existing = existingByUnit.get(unitId)

    if (existing) {
      const { error: updateError } = await supabase
        .from('occupancies')
        .update({
          start_date: startDate,
          end_date: endDate,
          notes: 'Sincronizado desde reserva'
        })
        .eq('id', existing.id)

      if (updateError) throw updateError
      existingByUnit.delete(unitId)
      continue
    }

    const { error: insertError } = await supabase
      .from('occupancies')
      .insert({
        unit_id: unitId,
        start_date: startDate,
        end_date: endDate,
        occupancy_type: 'reservation',
        reservation_id: reservationId,
        notes: 'Sincronizado desde reserva'
      })

    if (insertError) throw insertError
  }

  const staleIds = [...existingByUnit.values()].map(row => row.id)
  if (staleIds.length > 0) {
    const { error: staleDeleteError } = await supabase
      .from('occupancies')
      .delete()
      .in('id', staleIds)

    if (staleDeleteError) throw staleDeleteError
  }

  return { synced: true, reservationId }
}
