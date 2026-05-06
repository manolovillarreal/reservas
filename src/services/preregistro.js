import { supabase } from './supabase'
import { useAccountStore } from '../stores/account'
import { notifyPreregistroCompletado } from './notificationService'

const getAccountId = () => {
  const accountStore = useAccountStore()
  return accountStore.getRequiredAccountId()
}

const normalizeValue = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const buildGuestPayload = (guest) => {
  const documentType = normalizeValue(guest.document_type)
  const documentNumber = normalizeValue(guest.document_number)

  return {
    first_name: normalizeValue(guest.first_name),
    last_name: normalizeValue(guest.last_name),
    phone: normalizeValue(guest.phone),
    phone_country_code: normalizeValue(guest.phone_country_code) || '+57',
    email: normalizeValue(guest.email),
    nationality: normalizeValue(guest.nationality),
    document_type: documentType,
    document_number: documentNumber,
    birth_date: normalizeValue(guest.birth_date),
  }
}

const findExistingGuest = async (guestPayload, accountId) => {
  if (!guestPayload.document_type || !guestPayload.document_number) {
    return null
  }

  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('account_id', accountId)
    .eq('document_type', guestPayload.document_type)
    .eq('document_number', guestPayload.document_number)
    .maybeSingle()

  if (error) throw error
  return data
}

const upsertGuest = async (guestPayload, accountId) => {
  const existingGuest = await findExistingGuest(guestPayload, accountId)

  if (existingGuest) {
    const updatePayload = {
      first_name: guestPayload.first_name || existingGuest.first_name,
      last_name: guestPayload.last_name || existingGuest.last_name,
      phone: guestPayload.phone || existingGuest.phone,      phone_country_code: guestPayload.phone_country_code || existingGuest.phone_country_code || '+57',      email: guestPayload.email || existingGuest.email,
      nationality: guestPayload.nationality || existingGuest.nationality,
      document_type: guestPayload.document_type || existingGuest.document_type,
      document_number: guestPayload.document_number || existingGuest.document_number,
      birth_date: guestPayload.birth_date || existingGuest.birth_date,
    }

    const { data, error } = await supabase
      .from('guests')
      .update(updatePayload)
      .eq('account_id', accountId)
      .eq('id', existingGuest.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('guests')
    .insert({ ...guestPayload, account_id: accountId })
    .select()
    .single()

  if (error) throw error
  return data
}

export const completeReservationPreregistro = async ({ reservationId, guests, estimated_arrival_time, flight_number }) => {
  if (!reservationId) {
    throw new Error('Reserva inválida para completar pre-registro.')
  }

  if (!Array.isArray(guests) || guests.length === 0) {
    throw new Error('Debe registrar al menos un huésped.')
  }

  const primaryGuestInput = guests[0]
  if (!normalizeValue(primaryGuestInput?.first_name)) {
    throw new Error('El huésped principal debe tener nombre.')
  }

  const accountId = getAccountId()

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .select('id, status, guest_id, check_in')
    .eq('account_id', accountId)
    .eq('id', reservationId)
    .single()

  if (reservationError) throw reservationError

  const resolvedGuests = []
  for (const guest of guests) {
    const guestPayload = buildGuestPayload(guest)

    if (!guestPayload.first_name) {
      continue
    }

    const savedGuest = await upsertGuest(guestPayload, accountId)
    resolvedGuests.push(savedGuest)
  }

  if (resolvedGuests.length === 0) {
    throw new Error('No se pudo registrar ningún huésped.')
  }

  const { error: deleteExistingError } = await supabase
    .from('reservation_guests')
    .delete()
    .eq('account_id', accountId)
    .eq('reservation_id', reservationId)

  if (deleteExistingError) throw deleteExistingError

  const relationPayload = resolvedGuests.map((guest, index) => ({
    reservation_id: reservationId,
    guest_id: guest.id,
    account_id: accountId,
    is_primary: index === 0
  }))

  const { error: relationError } = await supabase
    .from('reservation_guests')
    .insert(relationPayload)

  if (relationError) throw relationError

  const primaryGuest = resolvedGuests[0]
  const updatePayload = {
    preregistro_completado: true,
    preregistro_completado_at: new Date().toISOString(),
    guest_id: primaryGuest.id,
    estimated_arrival_time: estimated_arrival_time || null,
    flight_number: flight_number || null,
  }

  const { error: updateError } = await supabase
    .from('reservations')
    .update(updatePayload)
    .eq('account_id', accountId)
    .eq('id', reservationId)

  if (updateError) throw updateError

  const { error: logError } = await supabase
    .from('reservation_status_logs')
    .insert({
      account_id: accountId,
      reservation_id: reservationId,
      previous_status: reservation.status,
      new_status: reservation.status,
      notes: 'Pre-registro digital completado',
    })

  if (logError) throw logError

  try {
    await notifyPreregistroCompletado(accountId, {
      id: reservationId,
      guest_name: `${primaryGuest.first_name || ''} ${primaryGuest.last_name || ''}`.trim(),
      check_in: reservation.check_in,
    })
  } catch (e) { /* silencioso */ }

  return {
    primaryGuest,
    guests: resolvedGuests,
  }
}
