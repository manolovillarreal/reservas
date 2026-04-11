import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHash, randomBytes } from 'node:crypto'

type GuestInput = {
  name?: string
  nationality?: string
  document_type?: 'passport' | 'cedula' | 'dni' | 'foreign_id' | ''
  document_number?: string
  phone?: string
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
    email: normalizeValue(guest.email),
    birth_date: birthDate,
  }
}

const getReservationByPrimaryTokenHash = async (
  client: ReturnType<typeof createClient>,
  tokenHash: string
) => {
  const { data, error } = await client
    .from('reservations')
    .select('id, account_id, status, check_in, check_out, adults, children, preregistro_completado, companion_token, companion_token_raw')
    .eq('preregistro_token', tokenHash)
    .maybeSingle()

  if (error) throw error
  return data
}

const getReservationByCompanionTokenHash = async (
  client: ReturnType<typeof createClient>,
  tokenHash: string
) => {
  const { data, error } = await client
    .from('reservations')
    .select('id, account_id, status, check_in, check_out, adults, children')
    .eq('companion_token', tokenHash)
    .maybeSingle()

  if (error) throw error
  return data
}

const getAccountProfile = async (
  client: ReturnType<typeof createClient>,
  accountId: string
) => {
  const { data } = await client
    .from('account_profile')
    .select('commercial_name, legal_name, phone')
    .eq('account_id', accountId)
    .maybeSingle()
  return data
}

const countRegisteredCompanions = async (
  client: ReturnType<typeof createClient>,
  reservationId: string,
  accountId: string
) => {
  const { count, error } = await client
    .from('reservation_guests')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('reservation_id', reservationId)
    .eq('is_primary', false)

  if (error) throw error
  return count ?? 0
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
      .select('id, name, nationality, document_type, document_number, phone, email, birth_date')
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
        email: payload.email || existing.email,
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // ---------------------------------------------------------------
    // GET: Obtener datos de la reserva por companion token
    // ---------------------------------------------------------------
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const companionToken = normalizeValue(url.searchParams.get('token'))

      if (!companionToken) {
        return Response.json({ message: 'token es requerido.' }, { status: 400, headers: corsHeaders })
      }

      const companionTokenHash = createHash('sha256').update(companionToken).digest('hex')
      const reservation = await getReservationByCompanionTokenHash(adminClient, companionTokenHash)

      if (!reservation) {
        return Response.json({ message: 'Link inválido.' }, { status: 404, headers: corsHeaders })
      }

      const BLOCKED_STATUSES = ['completed', 'finalized', 'cancelled']
      if (BLOCKED_STATUSES.includes(reservation.status)) {
        return Response.json({ message: 'Este link ya no está disponible.' }, { status: 410, headers: corsHeaders })
      }

      const profile = await getAccountProfile(adminClient, reservation.account_id)
      const guestsCount = Number(reservation.adults || 0) + Number(reservation.children || 0)

      const { data: primaryGuestRow } = await adminClient
        .from('reservation_guests')
        .select('guests!reservation_guests_guest_id_fkey(first_name, last_name)')
        .eq('reservation_id', reservation.id)
        .eq('is_primary', true)
        .maybeSingle()

      const pg = primaryGuestRow?.guests as { first_name?: string; last_name?: string } | null
      const primaryGuestName = pg
        ? [pg.first_name, pg.last_name].filter(Boolean).join(' ')
        : null

      return Response.json({
        reservation: {
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          guests_count: guestsCount > 0 ? guestsCount : 1,
        },
        account: {
          name: profile?.commercial_name || profile?.legal_name || 'Alojamiento',
          phone: profile?.phone || '',
        },
        primary_guest_name: primaryGuestName,
      }, { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return Response.json({ message: 'Metodo no permitido.' }, { status: 405, headers: corsHeaders })
    }

    const body = await req.json()
    const action = normalizeValue(body?.action)

    // ---------------------------------------------------------------
    // Acción: generate
    // Genera el companion_token para una reserva dado el primary_token.
    // Es idempotente: si ya existe un companion_token_raw, lo reusa.
    // ---------------------------------------------------------------
    if (action === 'generate') {
      const primaryToken = normalizeValue(body?.primary_token)
      if (!primaryToken) {
        return Response.json({ message: 'primary_token es requerido.' }, { status: 400, headers: corsHeaders })
      }

      const primaryTokenHash = createHash('sha256').update(primaryToken).digest('hex')
      const reservation = await getReservationByPrimaryTokenHash(adminClient, primaryTokenHash)

      if (!reservation) {
        return Response.json({ message: 'Link inválido.' }, { status: 404, headers: corsHeaders })
      }

      // Idempotente: reusar token existente si ya fue generado
      let companionRawToken: string

      if (reservation.companion_token_raw) {
        companionRawToken = reservation.companion_token_raw
      } else {
        companionRawToken = randomBytes(32).toString('hex')
        const companionHashedToken = createHash('sha256').update(companionRawToken).digest('hex')

        const { error: updateError } = await adminClient
          .from('reservations')
          .update({
            companion_token: companionHashedToken,
            companion_token_raw: companionRawToken,
          })
          .eq('id', reservation.id)

        if (updateError) {
          return Response.json({ message: updateError.message }, { status: 400, headers: corsHeaders })
        }
      }

      const companionPath = `/prerregistro-acompanante/${companionRawToken}`

      return Response.json(
        { companion_url: companionPath },
        { headers: corsHeaders }
      )
    }

    // ---------------------------------------------------------------
    // Acción: register
    // Registra un acompañante dado el companion_token.
    // ---------------------------------------------------------------
    if (action === 'register') {
      const companionToken = normalizeValue(body?.companion_token)
      const guestInput = (body?.guest || {}) as GuestInput

      if (!companionToken) {
        return Response.json({ message: 'companion_token es requerido.' }, { status: 400, headers: corsHeaders })
      }

      const companionTokenHash = createHash('sha256').update(companionToken).digest('hex')
      const reservation = await getReservationByCompanionTokenHash(adminClient, companionTokenHash)

      if (!reservation) {
        return Response.json({ message: 'Link inválido.' }, { status: 404, headers: corsHeaders })
      }

      const { data: profile } = await adminClient
        .from('account_profile')
        .select('phone')
        .eq('account_id', reservation.account_id)
        .maybeSingle()

      const accountId = reservation.account_id as string
      const totalGuests = Number(reservation.adults || 0) + Number(reservation.children || 0)
      const maxCompanions = Math.max(0, totalGuests - 1)

      const currentCompanions = await countRegisteredCompanions(adminClient, reservation.id, accountId)

      if (currentCompanions >= maxCompanions) {
        return Response.json(
          {
            message: 'Se ha alcanzado el límite de acompañantes para esta reserva.',
            contact_phone: profile?.phone || null,
          },
          { status: 409, headers: corsHeaders }
        )
      }

      const guestPayload = sanitizeGuest(guestInput)
      if (!guestPayload.name) {
        return Response.json({ message: 'El acompañante debe tener nombre.' }, { status: 400, headers: corsHeaders })
      }

      const savedGuest = await resolveGuest(adminClient, accountId, guestPayload)
      if (!savedGuest) {
        return Response.json({ message: 'No se pudo registrar el acompañante.' }, { status: 400, headers: corsHeaders })
      }

      // Verificar que este guest no esté ya registrado en esta reserva
      const { data: existingRelation } = await adminClient
        .from('reservation_guests')
        .select('id')
        .eq('account_id', accountId)
        .eq('reservation_id', reservation.id)
        .eq('guest_id', savedGuest.id)
        .maybeSingle()

      if (!existingRelation) {
        const { error: relationError } = await adminClient
          .from('reservation_guests')
          .insert({
            reservation_id: reservation.id,
            guest_id: savedGuest.id,
            is_primary: false,
            account_id: accountId,
          })

        if (relationError) throw relationError
      }

      const newCount = await countRegisteredCompanions(adminClient, reservation.id, accountId)
      const remaining = Math.max(0, maxCompanions - newCount)

      return Response.json(
        {
          success: true,
          companions_registered: newCount,
          companions_remaining: remaining,
          check_in: reservation.check_in,
        },
        { headers: corsHeaders }
      )
    }

    return Response.json({ message: 'Acción no reconocida.' }, { status: 400, headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Error inesperado.' },
      { status: 500, headers: corsHeaders }
    )
  }
})
