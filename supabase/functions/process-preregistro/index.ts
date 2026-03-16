import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeValue = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const buildGuestPayload = (guest: Record<string, unknown>) => {
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

const getReservationByToken = async (client: ReturnType<typeof createClient>, token: string) => {
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data, error } = await client
    .from('reservations')
    .select('id, guest_id, guest_name, guest_phone, guests_count, check_in, check_out, preregistro_completado, preregistro_token_expiry, venues(name)')
    .eq('preregistro_token', tokenHash)
    .maybeSingle()

  if (error) throw error
  return data
}

const resolveGuest = async (client: ReturnType<typeof createClient>, guestPayload: ReturnType<typeof buildGuestPayload>) => {
  if (!guestPayload.name) {
    return null
  }

  if (guestPayload.document_type && guestPayload.document_number) {
    const { data: existingGuest, error: existingError } = await client
      .from('guests')
      .select('*')
      .eq('document_type', guestPayload.document_type)
      .eq('document_number', guestPayload.document_number)
      .maybeSingle()

    if (existingError) throw existingError

    if (existingGuest) {
      const { data: updatedGuest, error: updateError } = await client
        .from('guests')
        .update({
          name: guestPayload.name || existingGuest.name,
          phone: guestPayload.phone || existingGuest.phone,
          nationality: guestPayload.nationality || existingGuest.nationality,
          document_type: guestPayload.document_type || existingGuest.document_type,
          document_number: guestPayload.document_number || existingGuest.document_number,
          document: guestPayload.document || existingGuest.document,
        })
        .eq('id', existingGuest.id)
        .select()
        .single()

      if (updateError) throw updateError
      return updatedGuest
    }
  }

  const { data: createdGuest, error: createError } = await client
    .from('guests')
    .insert(guestPayload)
    .select()
    .single()

  if (createError) throw createError
  return createdGuest
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const token = body.token
    const action = body.action || 'submit'

    if (!token) {
      return Response.json({ message: 'Token requerido.' }, { status: 400, headers: corsHeaders })
    }

    const reservation = await getReservationByToken(adminClient, token)

    if (!reservation) {
      return Response.json({ message: 'Token inválido.' }, { status: 404, headers: corsHeaders })
    }

    if (reservation.preregistro_completado) {
      return Response.json({ message: 'El pre-registro ya fue completado.' }, { status: 409, headers: corsHeaders })
    }

    if (reservation.preregistro_token_expiry && new Date(reservation.preregistro_token_expiry) < new Date()) {
      return Response.json({ message: 'El token de pre-registro está expirado.' }, { status: 410, headers: corsHeaders })
    }

    if (action === 'preview') {
      return Response.json({
        reservation: {
          id: reservation.id,
          venue_name: reservation.venues?.name || 'Alojamiento',
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          guests_count: reservation.guests_count,
        }
      }, { headers: corsHeaders })
    }

    const guests = Array.isArray(body.guests) ? body.guests : []
    if (guests.length === 0) {
      return Response.json({ message: 'Debe enviar al menos un huésped.' }, { status: 400, headers: corsHeaders })
    }

    const resolvedGuests = []
    for (const guest of guests) {
      const payload = buildGuestPayload(guest)
      const resolvedGuest = await resolveGuest(adminClient, payload)
      if (resolvedGuest) {
        resolvedGuests.push(resolvedGuest)
      }
    }

    if (resolvedGuests.length === 0) {
      return Response.json({ message: 'No se pudieron procesar huéspedes válidos.' }, { status: 400, headers: corsHeaders })
    }

    const { error: deleteRelationsError } = await adminClient
      .from('reservation_guests')
      .delete()
      .eq('reservation_id', reservation.id)

    if (deleteRelationsError) throw deleteRelationsError

    const relationPayload = resolvedGuests.map((guest, index) => ({
      reservation_id: reservation.id,
      guest_id: guest.id,
      is_primary: index === 0,
    }))

    const { error: relationError } = await adminClient
      .from('reservation_guests')
      .insert(relationPayload)

    if (relationError) throw relationError

    const primaryGuest = resolvedGuests[0]
    const updatePayload: Record<string, unknown> = {
      preregistro_completado: true,
      preregistro_completado_at: new Date().toISOString(),
      guest_name: primaryGuest.name,
      guest_phone: primaryGuest.phone || reservation.guest_phone || null,
    }

    if (!reservation.guest_id) {
      updatePayload.guest_id = primaryGuest.id
    }

    const { error: updateError } = await adminClient
      .from('reservations')
      .update(updatePayload)
      .eq('id', reservation.id)

    if (updateError) throw updateError

    return Response.json({ message: 'Pre-registro completado correctamente.' }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : 'Error inesperado.' }, { status: 500, headers: corsHeaders })
  }
})
