import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

type GuestInput = {
  name?: string
  nationality?: string
  document_type?: 'passport' | 'cedula' | 'dni' | 'foreign_id' | ''
  document_number?: string
  phone?: string
  phone_country_code?: string
  email?: string
  birth_date?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeValue = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const sanitizeGuest = (guest: GuestInput) => {
  const documentType = normalizeValue(guest.document_type)
  const documentNumber = normalizeValue(guest.document_number)
  const birthDate = normalizeValue(guest.birth_date)

  return {
    name: normalizeValue(guest.name),
    nationality: normalizeValue(guest.nationality),
    document_type: documentType,
    document_number: documentNumber,
    phone: normalizeValue(guest.phone),
    phone_country_code: normalizeValue(guest.phone_country_code) || '+57',
    email: normalizeValue(guest.email),
    document: documentNumber,
    birth_date: birthDate,
  }
}

const getReservationByToken = async (client: ReturnType<typeof createClient>, token: string) => {
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data, error } = await client
    .from('reservations')
    .select('id, account_id, status, check_in, guest_id, preregistro_completado')
    .eq('preregistro_token', tokenHash)
    .maybeSingle()

  if (error) throw error
  return data
}

const resolveGuest = async (
  client: ReturnType<typeof createClient>,
  accountId: string,
  payload: ReturnType<typeof sanitizeGuest>
) => {
  if (!payload.name) return null

  if (payload.document_type && payload.document_number) {
    const { data: existing, error: existingError } = await client
      .from('guests')
      .select('id, name, nationality, document_type, document_number, phone, email, document, birth_date')
      .eq('account_id', accountId)
      .eq('document_type', payload.document_type)
      .eq('document_number', payload.document_number)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const updatePayload = {
        name: payload.name || existing.name,
        nationality: payload.nationality || existing.nationality,
        document_type: payload.document_type || existing.document_type,
        document_number: payload.document_number || existing.document_number,
        phone: payload.phone || existing.phone,
        phone_country_code: payload.phone_country_code || existing.phone_country_code || '+57',
        email: payload.email || existing.email,
        document: payload.document || existing.document,
        birth_date: payload.birth_date || existing.birth_date,
      }

      const { data: updated, error: updateError } = await client
        .from('guests')
        .update(updatePayload)
        .eq('account_id', accountId)
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) throw updateError
      return updated
    }
  }

  const { data: created, error: createError } = await client
    .from('guests')
    .insert({ ...payload, account_id: accountId })
    .select()
    .single()

  if (createError) throw createError
  return created
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return Response.json({ message: 'Metodo no permitido.' }, { status: 405, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const token = normalizeValue(body?.token)
    const primaryGuestInput = (body?.primary_guest || {}) as GuestInput
    const additionalGuestsInput = Array.isArray(body?.additional_guests) ? body.additional_guests as GuestInput[] : []

    if (!token) {
      return Response.json({ message: 'Token requerido.' }, { status: 400, headers: corsHeaders })
    }

    const reservation = await getReservationByToken(adminClient, token)

    if (!reservation) {
      return Response.json({ message: 'Link inválido' }, { status: 404, headers: corsHeaders })
    }

    const { data: profile } = await adminClient
      .from('account_profile')
      .select('phone')
      .eq('account_id', reservation.account_id)
      .maybeSingle()

    if (reservation.preregistro_completado) {
      return Response.json(
        { message: 'Pre-registro ya completado', contact_phone: profile?.phone || null },
        { status: 409, headers: corsHeaders }
      )
    }

    const accountId = reservation.account_id as string

    const primaryGuestPayload = sanitizeGuest(primaryGuestInput)
    if (!primaryGuestPayload.name) {
      return Response.json({ message: 'El huesped principal debe tener nombre.' }, { status: 400, headers: corsHeaders })
    }

    const primaryGuest = await resolveGuest(adminClient, accountId, primaryGuestPayload)
    if (!primaryGuest) {
      return Response.json({ message: 'No se pudo resolver el huesped principal.' }, { status: 400, headers: corsHeaders })
    }

    const resolvedAdditionalGuests = [] as Array<Record<string, unknown>>

    for (const guest of additionalGuestsInput) {
      const payload = sanitizeGuest(guest)
      const resolved = await resolveGuest(adminClient, accountId, payload)
      if (resolved) {
        resolvedAdditionalGuests.push(resolved)
      }
    }

    const { error: deleteError } = await adminClient
      .from('reservation_guests')
      .delete()
      .eq('account_id', accountId)
      .eq('reservation_id', reservation.id)

    if (deleteError) throw deleteError

    const relationPayload = [
      {
        reservation_id: reservation.id,
        guest_id: primaryGuest.id,
        is_primary: true,
        account_id: accountId,
      },
      ...resolvedAdditionalGuests.map((guest) => ({
        reservation_id: reservation.id,
        guest_id: guest.id,
        is_primary: false,
        account_id: accountId,
      })),
    ]

    const { error: relationError } = await adminClient
      .from('reservation_guests')
      .insert(relationPayload)

    if (relationError) throw relationError

    const { error: reservationError } = await adminClient
      .from('reservations')
      .update({
        guest_id: primaryGuest.id,
        preregistro_completado: true,
        preregistro_completado_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('id', reservation.id)

    if (reservationError) throw reservationError

    const { error: logError } = await adminClient
      .from('reservation_status_logs')
      .insert({
        account_id: accountId,
        reservation_id: reservation.id,
        previous_status: reservation.status,
        new_status: reservation.status,
        notes: 'Pre-registro digital completado',
      })

    if (logError) throw logError

    return Response.json({ success: true, check_in: reservation.check_in }, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Error inesperado.' },
      { status: 500, headers: corsHeaders }
    )
  }
})
