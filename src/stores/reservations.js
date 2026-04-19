import { defineStore } from 'pinia'
import { ref } from 'vue'
import { markSyncSuccess } from '../composables/useConnectivity'
import { supabase } from '../services/supabase'
import { useAccountStore } from './account'
import {
  getCommissionAmount,
  getNetAmount,
  getReservationGuestName,
  getReservationGuestPhone,
  getBalanceAmount,
  getGuestsTotal
} from '../utils/reservationUtils'
import { getSourceLabel } from '../utils/sourceUtils'
import { getNextReservationNumber, resolveReservationReferenceCode, syncReservationOccupancy } from '../services/reservationService'
import { notifyNuevaReserva } from '../services/notificationService'

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

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D+/g, '')
  return digits || ''
}

export const useReservationsStore = defineStore('reservations', () => {
  const accountStore = useAccountStore()
  const reservations = ref([])
  const loading = ref(false)
  const error = ref(null)
  const lastOccupancySyncIssue = ref(null)
  const totalCount = ref(0)
  const currentPage = ref(1)
  const currentPageSize = ref(25)
  const currentSortBy = ref('check_in')
  const currentSortDir = ref('desc')
  const lastFetchParams = ref({})

  const fetchReservations = async (params = {}) => {
    loading.value = true
    error.value = null

    const {
      search = '',
      status = '',
      source = '',
      sourceDetailId = '',
      checkInFrom = null,
      checkInTo = null,
      sortBy = 'check_in',
      sortDir = 'desc',
      paginated = false,
      page = 1,
      pageSize = 25
    } = params

    lastFetchParams.value = {
      search,
      status,
      source,
      sourceDetailId,
      checkInFrom,
      checkInTo,
      sortBy,
      sortDir,
      paginated,
      page,
      pageSize
    }

    try {
      const accountId = accountStore.getRequiredAccountId()
      let query = supabase
        .from('reservations')
        .select(`
          *,
          guests!reservations_guest_id_fkey(first_name, last_name, phone, phone_country_code, email, nationality, document_type, document_number),
          source_detail_info:source_details!reservations_source_detail_id_fkey(id, source_type_id, name, label_es, suggested_commission_percentage, suggested_discount_percentage, is_active),
          venues(name),
          reservation_units(unit_id, units(name, venue_id)),
          reservation_guests(is_primary, guest_id, guests!reservation_guests_guest_id_fkey(*)),
          payments(amount)
        `, { count: 'exact' })
        .eq('account_id', accountId)
        .is('deleted_at', null)

      if (search) {
        query = query.or(`reference_code.ilike.%${search}%,reservation_number.ilike.%${search}%`)
      }

      if (status) {
        query = query.eq('status', status)
      }

      if (sourceDetailId) {
        query = query.eq('source_detail_id', sourceDetailId)
      }

      const normalizedFrom = normalizeDate(checkInFrom)
      const normalizedTo = normalizeDate(checkInTo)

      if (normalizedFrom) {
        query = query.gte('check_in', normalizedFrom)
      }

      if (normalizedTo) {
        query = query.lte('check_in', normalizedTo)
      }

      query = query.order(sortBy, { ascending: sortDir === 'asc' })

      if (paginated) {
        const fromIndex = Math.max((page - 1) * pageSize, 0)
        const toIndex = fromIndex + pageSize - 1
        query = query.range(fromIndex, toIndex)
      }

      const { data, error: supaError, count } = await query

      if (supaError) throw supaError

      totalCount.value = count || 0
      currentPage.value = paginated ? page : 1
      currentPageSize.value = pageSize
      currentSortBy.value = sortBy
      currentSortDir.value = sortDir

      if (!paginated) {
        totalCount.value = (data || []).length
      }

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
          balance: getBalanceAmount({ ...res, paid_amount: paidAmount }),
          source_display_label: getSourceLabel(res),
          guest_wa_url: (() => {
            const phone = res.guests?.phone
            if (!phone) return null
            const digits = ((res.guests?.phone_country_code || '').replace(/\D/g, '')) + phone.replace(/\D/g, '')
            return digits ? `https://wa.me/${digits}` : null
          })()
        }
      })

      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        markSyncSuccess('reservations', 'dashboard')
      }
    } catch (err) {
      error.value = err.message
      console.error('Error fetching reservations:', err)
    } finally {
      loading.value = false
    }
  }

  const getUnitAvailability = async (unitIds, checkIn, checkOut, excludeReservationId = null) => {
    try {
      const accountId = accountStore.getRequiredAccountId()
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
        .eq('account_id', accountId)
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

  const recalculateReservationPaidAmount = async (reservationId, accountId) => {
    const { data, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('account_id', accountId)
      .eq('reservation_id', reservationId)

    if (paymentsError) throw paymentsError

    const paidAmount = (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ paid_amount: paidAmount })
      .eq('account_id', accountId)
      .eq('id', reservationId)

    if (updateError) throw updateError
    return paidAmount
  }

  const createReservationWithPayment = async (reservationData, paymentData = null) => {
    const createdReservation = await createReservation(reservationData)

    const amount = Number(paymentData?.amount || 0)
    if (amount <= 0) {
      return {
        ...createdReservation,
        hadInitialPayment: false,
      }
    }

    const accountId = accountStore.getRequiredAccountId()
    const paymentDate = normalizeDate(paymentData?.payment_date) || normalizeDate(new Date())

    const paymentPayload = {
      account_id: accountId,
      reservation_id: createdReservation.id,
      payment_date: paymentDate,
      amount,
      method: paymentData?.method || 'efectivo',
      reference: paymentData?.reference ? String(paymentData.reference).trim() : null,
    }

    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert(paymentPayload)

    if (paymentInsertError) throw paymentInsertError

    const paidAmount = await recalculateReservationPaidAmount(createdReservation.id, accountId)
    await fetchReservations(lastFetchParams.value)

    return {
      ...createdReservation,
      paid_amount: paidAmount,
      hadInitialPayment: true,
    }
  }

  const createReservation = async (reservationData) => {
    loading.value = true
    error.value = null

    try {
      const accountId = accountStore.getRequiredAccountId()
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
      const referenceCode = await resolveReservationReferenceCode({
        accountId,
        inquiryId: reservationData.inquiry_id || null,
        providedCode: reservationData.reference_code || null
      })
      const guestFirstName = String(reservationData.guest_first_name || '').trim() || null
      const guestLastName = String(reservationData.guest_last_name || '').trim() || null
      const guestPhone = String(reservationData.guest_phone || '').trim() || null
      const guestEmail = String(reservationData.guest_email || '').trim() || null
      let resolvedGuestId = reservationData.guest_id || null

      if (!resolvedGuestId && (guestFirstName || guestPhone || guestEmail)) {
        const normalizedGuestPhone = normalizePhone(guestPhone)

        if (normalizedGuestPhone) {
          const { data: existingGuests, error: existingGuestsError } = await supabase
            .from('guests')
            .select('id, phone')
            .eq('account_id', accountId)
            .not('phone', 'is', null)

          if (existingGuestsError) throw existingGuestsError

          const matchedGuest = (existingGuests || []).find((guest) => normalizePhone(guest.phone) === normalizedGuestPhone)
          if (matchedGuest) {
            resolvedGuestId = matchedGuest.id
          }
        }

        if (!resolvedGuestId) {
          const guestPayload = {
            account_id: accountId,
            first_name: guestFirstName || guestPhone || guestEmail,
            last_name: guestLastName || null,
            phone: guestPhone,
            phone_country_code: String(reservationData.guest_phone_country_code || '+57'),
            email: guestEmail,
          }

          const { data: createdGuest, error: createdGuestError } = await supabase
            .from('guests')
            .insert(guestPayload)
            .select('id')
            .single()

          if (createdGuestError) throw createdGuestError
          resolvedGuestId = createdGuest.id
        }
      }

      const adults = Number(reservationData.adults || 1)
      const minors = Number(reservationData.minors || 0)
      const children = Number(reservationData.children || 0)
      const infants = Number(reservationData.infants || 0)
      const nights = getDaysDifference(normalizedCheckIn, normalizedCheckOut)
      const pricePerNight = Number(reservationData.price_per_night || 0)
      const totalAmount = Number(reservationData.total_amount || (pricePerNight * nights) || 0)

      const reservationPayload = {
        account_id: accountId,
        reservation_number: reservationNumber,
        venue_id: reservationData.venue_id,
        guest_id: resolvedGuestId,
        adults,
        minors,
        children,
        infants,
        check_in: normalizedCheckIn,
        check_out: normalizedCheckOut,
        price_per_night: pricePerNight || null,
        total_amount: totalAmount,
        paid_amount: Number(reservationData.paid_amount || 0),
        commission_percentage: reservationData.commission_percentage || null,
        discount_percentage: Number(reservationData.discount_percentage || 0),
        status: reservationData.status || 'confirmed',
        source_detail_id: reservationData.source_detail_id || null,
        source_name: reservationData.source_name || null,
        reference_code: referenceCode,
        notes: reservationData.notes || null
      }

      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert(reservationPayload)
        .select()
        .single()

      if (insertError) throw insertError

      const reservationUnitsPayload = unitIds.map(unitId => ({
        account_id: accountId,
        reservation_id: data.id,
        unit_id: unitId
      }))

      const { error: reservationUnitsError } = await supabase
        .from('reservation_units')
        .insert(reservationUnitsPayload)

      if (reservationUnitsError) throw reservationUnitsError

      await supabase.from('reservation_status_logs').insert({
        account_id: accountId,
        reservation_id: data.id,
        new_status: data.status,
        notes: 'Creación inicial'
      })

      if (reservationData.inquiry_id) {
        await supabase
          .from('inquiries')
          .update({
            status: 'convertida',
            reservation_id: data.id,
            reference_code: referenceCode,
            notes: reservationData.inquiry_conversion_note || 'Convertida manualmente a reserva.'
          })
          .eq('account_id', accountId)
          .eq('id', reservationData.inquiry_id)
      }

      const syncResult = await trySyncReservationOccupancy(data.id)

      await fetchReservations(lastFetchParams.value)

      try { await notifyNuevaReserva(accountId, { ...data, guest_name: `${guestFirstName || ''} ${guestLastName || ''}`.trim() }) } catch (e) { /* silencioso */ }

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

  const updateReservationUnits = async (reservationId, unitIds = []) => {
    loading.value = true
    error.value = null

    try {
      const accountId = accountStore.getRequiredAccountId()
      if (!reservationId) {
        throw new Error('No se pudo identificar la reserva a actualizar.')
      }

      const normalizedUnitIds = [...new Set((unitIds || []).filter(Boolean))]
      if (normalizedUnitIds.length === 0) {
        throw new Error('Debes seleccionar al menos una unidad.')
      }

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select('id, check_in, check_out, status')
        .eq('account_id', accountId)
        .eq('id', reservationId)
        .single()

      if (reservationError) throw reservationError
      if (!reservation) {
        throw new Error('No se encontró la reserva indicada.')
      }

      if (reservation.status === 'cancelled') {
        throw new Error('No se pueden modificar unidades de una reserva cancelada.')
      }

      const overlap = await checkOverlap(
        normalizedUnitIds,
        reservation.check_in,
        reservation.check_out,
        reservation.id
      )

      if (overlap) {
        throw new Error('Las unidades seleccionadas no están disponibles para esas fechas.')
      }

      const { error: deleteError } = await supabase
        .from('reservation_units')
        .delete()
        .eq('account_id', accountId)
        .eq('reservation_id', reservation.id)

      if (deleteError) throw deleteError

      const payload = normalizedUnitIds.map((unitId) => ({
        account_id: accountId,
        reservation_id: reservation.id,
        unit_id: unitId
      }))

      const { error: insertError } = await supabase
        .from('reservation_units')
        .insert(payload)

      if (insertError) throw insertError

      const syncResult = await trySyncReservationOccupancy(reservation.id)

      await fetchReservations(lastFetchParams.value)

      return {
        reservationId: reservation.id,
        unitIds: normalizedUnitIds,
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
    totalCount,
    currentPage,
    currentPageSize,
    currentSortBy,
    currentSortDir,
    lastFetchParams,
    loading,
    error,
    lastOccupancySyncIssue,
    fetchReservations,
    createReservationWithPayment,
    createReservation,
    updateReservationUnits,
    checkOverlap,
    getUnitAvailability,
    retryReservationOccupancySync
  }
})
