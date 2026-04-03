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
    .select('id, account_id, status, check_in, check_out, adults, children, guest_id, preregistro_completado, preregistro_token_expiry')
    .eq('preregistro_token', tokenHash)
    .maybeSingle()

  if (error) throw error
  return data
}

const BLOCKED_STATUSES = ['completed', 'finalized', 'cancelled']

const checkTokenValidity = (reservation: NonNullable<Awaited<ReturnType<typeof getReservationByToken>>>) => {
  if (BLOCKED_STATUSES.includes(reservation.status)) {
    return { valid: false, status: 410 as const }
  }
  if (reservation.preregistro_token_expiry) {
    const expiry = new Date(reservation.preregistro_token_expiry)
    if (expiry <= new Date()) {
      return { valid: false, status: 410 as const }
    }
  }
  return { valid: true }
}

// Upsert guest by document — only used when there is no prior guest_id
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

const isGuestComplete = (guest: Record<string, unknown> | null): boolean => {
  if (!guest) return false
  return Boolean(
    guest.name &&
    guest.document_type &&
    guest.document_number &&
    guest.email &&
    guest.nationality &&
    guest.birth_date
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const token = normalizeValue(url.searchParams.get('token'))

  if (!token) {
    return Response.json({ message: 'Token requerido.' }, { status: 400, headers: corsHeaders })
  }

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const reservation = await getReservationByToken(adminClient, token)

      if (!reservation) {
        return Response.json({ message: 'Link inválido.' }, { status: 404, headers: corsHeaders })
      }

      const validity = checkTokenValidity(reservation)
      if (!validity.valid) {
        return Response.json({ message: 'Este link ya no está disponible.' }, { status: 410, headers: corsHeaders })
      }

      const accountId = reservation.account_id as string
      const guestsCount = Math.max(1, Number(reservation.adults || 0) + Number(reservation.children || 0))

      const [
        { data: reservationGuests },
        { data: accountProfile },
      ] = await Promise.all([
        adminClient
          .from('reservation_guests')
          .select('is_primary, guest_id, guests!reservation_guests_guest_id_fkey(*)')
          .eq('reservation_id', reservation.id),
        adminClient
          .from('account_profile')
          .select('commercial_name, legal_name, phone')
          .eq('account_id', accountId)
          .maybeSingle(),
      ])

      const rows = reservationGuests || []
      const primaryRow = rows.find((r) => r.is_primary)
      const companionRows = rows.filter((r) => !r.is_primary)

      const primaryGuest = primaryRow?.guests ?? null
      const companions = companionRows.map((r) => r.guests).filter(Boolean)

      const companionsExpected = Math.max(0, guestsCount - 1)
      const companionsRemaining = Math.max(0, companionsExpected - companions.length)

      return Response.json(
        {
          reservation: {
            id: reservation.id,
            check_in: reservation.check_in,
            check_out: reservation.check_out,
            adults: reservation.adults,
            children: reservation.children,
            guests_count: guestsCount,
            status: reservation.status,
            preregistro_completado: reservation.preregistro_completado,
          },
          guest: primaryGuest,
          companions,
          companions_remaining: companionsRemaining,
          account: {
            name: accountProfile?.commercial_name || accountProfile?.legal_name || 'Alojamiento',
            phone: accountProfile?.phone || '',
          },
        },
        { headers: corsHeaders }
      )
    } catch (error) {
      return Response.json(
        { message: error instanceof Error ? error.message : 'Error inesperado.' },
        { status: 500, headers: corsHeaders }
      )
    }
  }

  // ── POST ────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const guestInput = (body?.guest || {}) as GuestInput
      const companionsInput = Array.isArray(body?.companions) ? (body.companions as GuestInput[]) : []

      const reservation = await getReservationByToken(adminClient, token)

      if (!reservation) {
        return Response.json({ message: 'Link inválido.' }, { status: 404, headers: corsHeaders })
      }

      const validity = checkTokenValidity(reservation)
      if (!validity.valid) {
        return Response.json({ message: 'Este link ya no está disponible.' }, { status: 410, headers: corsHeaders })
      }

      if (reservation.preregistro_completado) {
        const { data: profile } = await adminClient
          .from('account_profile')
          .select('phone')
          .eq('account_id', reservation.account_id)
          .maybeSingle()
        return Response.json(
          { message: 'Pre-registro ya completado.', contact_phone: profile?.phone || null },
          { status: 409, headers: corsHeaders }
        )
      }

      const accountId = reservation.account_id as string
      const guestPayload = sanitizeGuest(guestInput)

      if (!guestPayload.name) {
        return Response.json({ message: 'El huésped principal debe tener nombre.' }, { status: 400, headers: corsHeaders })
      }

      // Resolve primary guest
      let primaryGuestId: string

      if (reservation.guest_id) {
        // Direct UPDATE on existing guest_id — no document lookup
        const updatePayload: Record<string, unknown> = {}
        if (guestPayload.name) updatePayload.name = guestPayload.name
        if (guestPayload.nationality) updatePayload.nationality = guestPayload.nationality
        if (guestPayload.document_type) updatePayload.document_type = guestPayload.document_type
        if (guestPayload.document_number) {
          updatePayload.document_number = guestPayload.document_number
          updatePayload.document = guestPayload.document_number
        }
        if (guestPayload.phone) updatePayload.phone = guestPayload.phone
        if (guestPayload.phone_country_code) updatePayload.phone_country_code = guestPayload.phone_country_code
        if (guestPayload.email) updatePayload.email = guestPayload.email
        if (guestPayload.birth_date) updatePayload.birth_date = guestPayload.birth_date

        const { error: updateError } = await adminClient
          .from('guests')
          .update(updatePayload)
          .eq('account_id', accountId)
          .eq('id', reservation.guest_id)

        if (updateError) throw updateError
        primaryGuestId = reservation.guest_id as string
      } else {
        // Upsert by document when no prior guest_id
        const primaryGuest = await resolveGuest(adminClient, accountId, guestPayload)
        if (!primaryGuest) {
          return Response.json({ message: 'No se pudo resolver el huésped principal.' }, { status: 400, headers: corsHeaders })
        }
        primaryGuestId = primaryGuest.id as string
      }

      // Ensure primary guest row exists in reservation_guests
      const { data: existingPrimaryRow } = await adminClient
        .from('reservation_guests')
        .select('guest_id')
        .eq('reservation_id', reservation.id)
        .eq('is_primary', true)
        .maybeSingle()

      if (!existingPrimaryRow) {
        await adminClient.from('reservation_guests').insert({
          reservation_id: reservation.id,
          guest_id: primaryGuestId,
          is_primary: true,
          account_id: accountId,
        })
      }

      // Get existing companions to avoid duplicates
      const { data: existingCompanionRows } = await adminClient
        .from('reservation_guests')
        .select('guest_id')
        .eq('reservation_id', reservation.id)
        .eq('is_primary', false)

      const existingCompanionIds = new Set((existingCompanionRows || []).map((r) => r.guest_id))

      // Insert only new companions
      for (const companionInput of companionsInput) {
        const payload = sanitizeGuest(companionInput)
        const resolved = await resolveGuest(adminClient, accountId, payload)
        if (resolved && !existingCompanionIds.has(resolved.id)) {
          await adminClient.from('reservation_guests').insert({
            reservation_id: reservation.id,
            guest_id: resolved.id,
            is_primary: false,
            account_id: accountId,
          })
          existingCompanionIds.add(resolved.id)
        }
      }

      // Compute completeness
      const guestsCount = Math.max(1, Number(reservation.adults || 0) + Number(reservation.children || 0))
      const companionsExpected = Math.max(0, guestsCount - 1)
      const { data: allGuestRows } = await adminClient
        .from('reservation_guests')
        .select('is_primary, guests!reservation_guests_guest_id_fkey(*)')
        .eq('reservation_id', reservation.id)

      const rows = allGuestRows || []
      const primaryRow = rows.find((r) => r.is_primary)
      const companionCount = rows.filter((r) => !r.is_primary).length
      const primaryComplete = isGuestComplete(primaryRow?.guests ?? null)
      const companionsRemaining = Math.max(0, companionsExpected - companionCount)
      const isComplete = primaryComplete && companionsRemaining === 0

      // Update reservation
      const { error: reservationUpdateError } = await adminClient
        .from('reservations')
        .update({
          guest_id: primaryGuestId,
          preregistro_completado: true,
          preregistro_completado_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)
        .eq('id', reservation.id)

      if (reservationUpdateError) throw reservationUpdateError

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

      return Response.json(
        { success: true, companions_remaining: companionsRemaining, is_complete: isComplete, check_in: reservation.check_in },
        { headers: corsHeaders }
      )
    } catch (error) {
      return Response.json(
        { message: error instanceof Error ? error.message : 'Error inesperado.' },
        { status: 500, headers: corsHeaders }
      )
    }
  }

  return Response.json({ message: 'Método no permitido.' }, { status: 405, headers: corsHeaders })
})
