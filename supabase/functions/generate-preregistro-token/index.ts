import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHash, randomBytes } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const toIsoDate = (value: string) => {
  const base = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(base.getTime())) {
    throw new Error('La reserva no tiene una fecha de check-in valida.')
  }
  return base
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return Response.json({ message: 'Metodo no permitido.' }, { status: 405, headers: corsHeaders })
    }

    const authorization = req.headers.get('Authorization') || ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser()

    if (authError || !user) {
      return Response.json({ message: 'No autorizado.' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const reservationId = body?.reservation_id

    if (!reservationId || typeof reservationId !== 'string') {
      return Response.json({ message: 'reservation_id es obligatorio.' }, { status: 400, headers: corsHeaders })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: reservation, error: reservationError } = await adminClient
      .from('reservations')
      .select('id, account_id, check_in, check_out, adults, children, preregistro_completado')
      .eq('id', reservationId)
      .maybeSingle()

    if (reservationError || !reservation) {
      return Response.json({ message: 'Reserva no encontrada.' }, { status: 404, headers: corsHeaders })
    }

    const { data: membership, error: membershipError } = await adminClient
      .from('account_users')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('account_id', reservation.account_id)
      .maybeSingle()

    if (membershipError || !membership) {
      return Response.json({ message: 'No autorizado para esta reserva.' }, { status: 403, headers: corsHeaders })
    }

    if (reservation.preregistro_completado) {
      return Response.json({ message: 'El pre-registro ya fue completado.' }, { status: 409, headers: corsHeaders })
    }

    const rawToken = randomBytes(32).toString('hex')
    const hashedToken = createHash('sha256').update(rawToken).digest('hex')

    const checkIn = toIsoDate(reservation.check_in)
    checkIn.setUTCHours(checkIn.getUTCHours() + 48)

    const { error: updateError } = await adminClient
      .from('reservations')
      .update({
        preregistro_token: hashedToken,
        preregistro_token_expiry: checkIn.toISOString(),
      })
      .eq('account_id', reservation.account_id)
      .eq('id', reservation.id)

    if (updateError) {
      return Response.json({ message: updateError.message }, { status: 400, headers: corsHeaders })
    }

    const { data: profile } = await adminClient
      .from('account_profile')
      .select('commercial_name, legal_name, phone')
      .eq('account_id', reservation.account_id)
      .maybeSingle()

    const guestsCount = Number(reservation.adults || 0) + Number(reservation.children || 0)
    const params = new URLSearchParams({
      check_in: String(reservation.check_in || ''),
      check_out: String(reservation.check_out || ''),
      guests_count: String(guestsCount > 0 ? guestsCount : 1),
      accommodation: String(profile?.commercial_name || profile?.legal_name || 'Alojamiento'),
      contact_phone: String(profile?.phone || ''),
    })

    return Response.json(
      {
        checkin_url: `/prerregistro/${rawToken}?${params.toString()}`,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Error inesperado.' },
      { status: 500, headers: corsHeaders }
    )
  }
})
