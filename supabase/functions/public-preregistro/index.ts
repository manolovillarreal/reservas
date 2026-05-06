export const config = {
  verify_jwt: false,
}

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHash } from 'node:crypto'

type GuestInput = {
  first_name?: string
  last_name?: string
  nationality?: string
  document_type?: 'CC' | 'CE' | 'PA' | 'PE' | 'PT' | 'DNI' | 'TI' | 'RC' | 'MS' | ''
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

const EDIT_WINDOW_MS = 12 * 60 * 60 * 1000

const formatDateLongEs = (value: string | null) => {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')


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
    first_name: normalizeValue(guest.first_name),
    last_name: normalizeValue(guest.last_name),
    nationality: normalizeValue(guest.nationality),
    document_type: documentType,
    document_number: documentNumber,
    phone: normalizeValue(guest.phone),
    phone_country_code: normalizeValue(guest.phone_country_code) || '+57',
    email: normalizeValue(guest.email),
    birth_date: birthDate,
  }
}

const getReservationByToken = async (client: ReturnType<typeof createClient>, token: string) => {
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data, error } = await client
    .from('reservations')
    .select('id, account_id, status, check_in, check_out, adults, children, guest_id, preregistro_completado, preregistro_completado_at, preregistro_token_expiry, estimated_arrival_time, flight_number')
    .eq('preregistro_token', tokenHash)
    .maybeSingle()

  if (error) throw error
  return data
}

const BLOCKED_STATUSES = ['completed', 'finalized', 'cancelled']

const checkTokenValidity = (reservation: NonNullable<Awaited<ReturnType<typeof getReservationByToken>>>) => {
  if (BLOCKED_STATUSES.includes(reservation.status)) {
    return { valid: false, status: 410 as const, reason: 'unavailable' }
  }
  if (reservation.preregistro_token_expiry) {
    const expiry = new Date(reservation.preregistro_token_expiry)
    if (expiry <= new Date()) {
      return { valid: false, status: 410 as const, reason: 'unavailable' }
    }
  }
  // CAMBIO 5: 12h edit window
  if (reservation.preregistro_completado && reservation.preregistro_completado_at) {
    const completedAt = new Date(reservation.preregistro_completado_at)
    if (Date.now() - completedAt.getTime() > EDIT_WINDOW_MS) {
      return { valid: false, status: 410 as const, reason: 'edit_expired' }
    }
  }
  return { valid: true as const }
}

// Upsert guest by document — only used when there is no prior guest_id
const resolveGuest = async (
  client: ReturnType<typeof createClient>,
  accountId: string,
  payload: ReturnType<typeof sanitizeGuest>
) => {
  if (!payload.first_name) return null

  if (payload.document_type && payload.document_number) {
    const { data: existing, error: existingError } = await client
      .from('guests')
      .select('id, first_name, last_name, nationality, document_type, document_number, phone, email, birth_date')
      .eq('account_id', accountId)
      .eq('document_type', payload.document_type)
      .eq('document_number', payload.document_number)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const updatePayload = {
        first_name: payload.first_name || existing.first_name,
        last_name: payload.last_name || existing.last_name,
        nationality: payload.nationality || existing.nationality,
        document_type: payload.document_type || existing.document_type,
        document_number: payload.document_number || existing.document_number,
        phone: payload.phone || existing.phone,
        phone_country_code: payload.phone_country_code || existing.phone_country_code || '+57',
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

const isGuestComplete = (guest: Record<string, unknown> | null): boolean => {
  if (!guest) return false
  return Boolean(
    guest.first_name &&
    guest.document_type &&
    guest.document_number &&
    guest.email &&
    guest.nationality &&
    guest.birth_date
  )
}

interface PreregistroRenderParams {
  businessName: string
  logoUrl: string | null
  guestName: string | null
  checkIn: string | null
  checkOut: string | null
  guestsCount: number
  ogDescription: string
  publicUrl: string
  token: string
}

function renderPreregistroHtml(p: PreregistroRenderParams): string {
  const logoTag = p.logoUrl
    ? `<img src="${esc(p.logoUrl)}" alt="${esc(p.businessName)}" style="width:64px;height:64px;object-fit:contain;border-radius:12px;border:1px solid #e5e7eb;background:#fff;display:block;margin:0 auto 12px" />`
    : ''

  const staySection = p.checkIn && p.checkOut
    ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:14px;line-height:1.7;color:#374151">
        <p style="margin:0">🗓 <strong>Check-in:</strong> ${esc(formatDateLongEs(p.checkIn))}</p>
        <p style="margin:0">🗓 <strong>Check-out:</strong> ${esc(formatDateLongEs(p.checkOut))}</p>
        <p style="margin:0">👥 ${p.guestsCount} ${p.guestsCount === 1 ? 'persona' : 'personas'}</p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="0;url=${esc(p.publicUrl)}" />
  <title>${esc(p.businessName)} · Pre-registro</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Pre-registro · ${esc(p.businessName)}" />
  <meta property="og:description" content="${esc(p.ogDescription)}" />
  ${p.logoUrl ? `<meta property="og:image" content="${esc(p.logoUrl)}" />` : ''}
  <meta property="og:site_name" content="${esc(p.businessName)}" />
  <meta property="og:url" content="${esc(p.publicUrl)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Pre-registro · ${esc(p.businessName)}" />
  <meta name="twitter:description" content="${esc(p.ogDescription)}" />
  ${p.logoUrl ? `<meta name="twitter:image" content="${esc(p.logoUrl)}" />` : ''}
</head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px 16px 64px">
  <div style="max-width:520px;margin:0 auto">
    <div style="text-align:center;margin-bottom:20px">
      ${logoTag}
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827">${esc(p.businessName)}</h1>
      <p style="margin:0;font-size:14px;color:#6b7280">Pre-registro de huéspedes</p>
    </div>

    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 20px 4px;box-shadow:0 1px 3px rgba(0,0,0,.07)">
      ${p.guestName ? `<h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827">Hola ${esc(p.guestName)} 👋</h2>` : '<h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827">Pre-registro 👋</h2>'}
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280">Completa tu información antes de llegar al alojamiento.</p>
      ${staySection}
      <p style="margin:16px 0 16px;font-size:13px;color:#9ca3af;text-align:center">Si tienes dudas, contáctanos.</p>
    </div>
  </div>
</body>
</html>`
}

function notFoundPreregistroHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pre-registro no encontrado</title>
</head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="text-align:center;padding:40px">
    <h1 style="color:#374151">Pre-registro no encontrado</h1>
    <p style="color:#6b7280">El enlace puede ser inválido, haber expirado o la reserva fue cancelada.</p>
  </div>
</body>
</html>`
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
      const format = normalizeValue(url.searchParams.get('format'))
      const reservation = await getReservationByToken(adminClient, token)

      if (!reservation) {
        if (format === 'json') {
          return Response.json({ message: 'Link inválido.' }, { status: 404, headers: corsHeaders })
        }
        return new Response(notFoundPreregistroHtml(), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        })
      }

      const validity = checkTokenValidity(reservation)
      if (!validity.valid) {
        const msg = validity.reason === 'edit_expired'
          ? 'El período de edición del pre-registro ha finalizado. Para modificaciones, contacta al alojamiento.'
          : 'Este link ya no está disponible.'
        if (format === 'json') {
          return Response.json({ message: msg, reason: validity.reason }, { status: 410, headers: corsHeaders })
        }
        return new Response(notFoundPreregistroHtml(), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        })
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
          .select('commercial_name, legal_name, phone, logo_url')
          .eq('account_id', accountId)
          .maybeSingle(),
      ])

      // deno-lint-ignore no-explicit-any
      const rows: any[] = reservationGuests || []
      const primaryRow = rows.find((r: any) => r.is_primary)
      const companionRows = rows.filter((r: any) => !r.is_primary)

      // deno-lint-ignore no-explicit-any
      let primaryGuest: any = primaryRow?.guests ?? null

      // Fallback for reservations that have guest_id but no reservation_guests row yet
      if (!primaryGuest && reservation.guest_id) {
        const { data: directGuest } = await adminClient
          .from('guests')
          .select('*')
          .eq('id', reservation.guest_id)
          .maybeSingle()
        primaryGuest = directGuest ?? null
      }

      const companions = companionRows.map((r: any) => r.guests).filter(Boolean)

      const companionsExpected = Math.max(0, guestsCount - 1)
      const companionsRemaining = Math.max(0, companionsExpected - companions.length)

      // JSON response
      if (format === 'json') {
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
              estimated_arrival_time: reservation.estimated_arrival_time,
              flight_number: reservation.flight_number,
            },
            guest: primaryGuest,
            companions,
            companions_remaining: companionsRemaining,
            account: {
              name: accountProfile?.commercial_name || accountProfile?.legal_name || 'Alojamiento',
              phone: accountProfile?.phone || '',
              logo_url: accountProfile?.logo_url || null,
            },
          },
          { headers: corsHeaders }
        )
      }

      // HTML response with OG tags
      const businessName = accountProfile?.commercial_name || accountProfile?.legal_name || 'Alojamiento'
      const logoUrl: string | null = accountProfile?.logo_url || null
      const guestName = primaryGuest
        ? `${primaryGuest.first_name || ''} ${primaryGuest.last_name || ''}`.trim()
        : null

      const ogDescription = [
        guestName ? `Hola ${guestName}` : null,
        'Completa tu información antes de llegar',
        reservation.check_in ? `Check-in: ${formatDateLongEs(reservation.check_in)}` : null,
      ].filter(Boolean).join('. ')

      const publicUrl = `https://inn.tekmi.co/prerregistro/${token}`

      const html = renderPreregistroHtml({
        businessName,
        logoUrl,
        guestName,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        guestsCount,
        ogDescription,
        publicUrl,
        token,
      })

      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    } catch (error) {
      const format = normalizeValue(url.searchParams.get('format'))
      if (format === 'json') {
        return Response.json(
          { message: error instanceof Error ? error.message : 'Error inesperado.' },
          { status: 500, headers: corsHeaders }
        )
      }
      return new Response(notFoundPreregistroHtml(), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }

  // ── POST ────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const guestInput = (body?.guest || {}) as GuestInput
      const companionsInput = Array.isArray(body?.companions) ? (body.companions as GuestInput[]) : []
      const estimatedArrivalTime = normalizeValue(body?.estimated_arrival_time)
      const flightNumber = normalizeValue(body?.flight_number)?.toUpperCase() || null

      const reservation = await getReservationByToken(adminClient, token)

      if (!reservation) {
        return Response.json({ message: 'Link inválido.' }, { status: 404, headers: corsHeaders })
      }

      // CAMBIO 5: checkTokenValidity now blocks edit_expired (>12h) with 410
      const validity = checkTokenValidity(reservation)
      if (!validity.valid) {
        const msg = validity.reason === 'edit_expired'
          ? 'El período de edición del pre-registro ha finalizado. Para modificaciones, contacta al alojamiento.'
          : 'Este link ya no está disponible.'
        return Response.json({ message: msg, reason: validity.reason }, { status: 410, headers: corsHeaders })
      }

      const accountId = reservation.account_id as string
      const guestPayload = sanitizeGuest(guestInput)

      if (!guestPayload.first_name) {
        return Response.json({ message: 'El huésped principal debe tener nombre.' }, { status: 400, headers: corsHeaders })
      }

      // Resolve primary guest
      let primaryGuestId: string

      if (reservation.guest_id) {
        // Direct UPDATE on existing guest_id — no document lookup
        const updatePayload: Record<string, unknown> = {}
        if (guestPayload.first_name) updatePayload.first_name = guestPayload.first_name
        if (guestPayload.last_name) updatePayload.last_name = guestPayload.last_name
        if (guestPayload.nationality) updatePayload.nationality = guestPayload.nationality
        if (guestPayload.document_type) updatePayload.document_type = guestPayload.document_type
        if (guestPayload.document_number) updatePayload.document_number = guestPayload.document_number
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

      // CAMBIO 3: block if companion capacity is full
      const guestsCount = Math.max(1, Number(reservation.adults || 0) + Number(reservation.children || 0))
      const companionsExpected = Math.max(0, guestsCount - 1)
      if (companionsInput.length > 0 && existingCompanionIds.size >= companionsExpected) {
        return Response.json(
          { message: 'El límite de acompañantes ha sido alcanzado.' },
          { status: 422, headers: corsHeaders }
        )
      }

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
      const { data: allGuestRows } = await adminClient
        .from('reservation_guests')
        .select('is_primary, guests!reservation_guests_guest_id_fkey(*)')
        .eq('reservation_id', reservation.id)

      // deno-lint-ignore no-explicit-any
      const rows: any[] = allGuestRows || []
      const primaryRow = rows.find((r: any) => r.is_primary)
      const companionCount = rows.filter((r: any) => !r.is_primary).length
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
          estimated_arrival_time: estimatedArrivalTime,
          flight_number: flightNumber,
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
