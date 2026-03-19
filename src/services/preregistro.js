import { supabase } from './supabase'
import { useAccountStore } from '../stores/account'

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
    name: normalizeValue(guest.name),
    phone: normalizeValue(guest.phone),
    nationality: normalizeValue(guest.nationality),
    document_type: documentType,
    document_number: documentNumber,
    document: documentNumber,
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
      name: guestPayload.name || existingGuest.name,
      phone: guestPayload.phone || existingGuest.phone,
      nationality: guestPayload.nationality || existingGuest.nationality,
      document_type: guestPayload.document_type || existingGuest.document_type,
      document_number: guestPayload.document_number || existingGuest.document_number,
      document: guestPayload.document || existingGuest.document,
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

export const completeReservationPreregistro = async ({ reservationId, guests }) => {
  if (!reservationId) {
    throw new Error('Reserva inválida para completar pre-registro.')
  }

  if (!Array.isArray(guests) || guests.length === 0) {
    throw new Error('Debe registrar al menos un huésped.')
  }

  const primaryGuestInput = guests[0]
  if (!normalizeValue(primaryGuestInput?.name)) {
    throw new Error('El huésped principal debe tener nombre.')
  }

  const accountId = getAccountId()

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .select('id, guest_id, guest_name, guest_phone')
    .eq('account_id', accountId)
    .eq('id', reservationId)
    .single()

  if (reservationError) throw reservationError

  const resolvedGuests = []
  for (const guest of guests) {
    const guestPayload = buildGuestPayload(guest)

    if (!guestPayload.name) {
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
    guest_name: primaryGuest.name,
    guest_phone: primaryGuest.phone || reservation.guest_phone || null,
  }

  if (!reservation.guest_id) {
    updatePayload.guest_id = primaryGuest.id
  }

  const { error: updateError } = await supabase
    .from('reservations')
    .update(updatePayload)
    .eq('account_id', accountId)
    .eq('id', reservationId)

  if (updateError) throw updateError

  return {
    primaryGuest,
    guests: resolvedGuests,
  }
}
