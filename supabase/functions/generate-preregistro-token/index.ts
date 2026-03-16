import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHash, randomBytes } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorization = req.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization || '' } }
    })

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser()

    if (authError || !user) {
      return Response.json({ message: 'No autorizado.' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const reservationId = body.reservation_id
    const baseUrl = body.base_url

    if (!reservationId || !baseUrl) {
      return Response.json({ message: 'reservation_id y base_url son obligatorios.' }, { status: 400, headers: corsHeaders })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: reservation, error: reservationError } = await adminClient
      .from('reservations')
      .select('id, check_in, preregistro_completado')
      .eq('id', reservationId)
      .single()

    if (reservationError || !reservation) {
      return Response.json({ message: 'Reserva no encontrada.' }, { status: 404, headers: corsHeaders })
    }

    if (reservation.preregistro_completado) {
      return Response.json({ message: 'El pre-registro ya fue completado.' }, { status: 409, headers: corsHeaders })
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiry = new Date(`${reservation.check_in}T00:00:00.000Z`)
    expiry.setUTCHours(expiry.getUTCHours() + 24)

    const { error: updateError } = await adminClient
      .from('reservations')
      .update({
        preregistro_token: tokenHash,
        preregistro_token_expiry: expiry.toISOString(),
      })
      .eq('id', reservationId)

    if (updateError) {
      return Response.json({ message: updateError.message }, { status: 400, headers: corsHeaders })
    }

    return Response.json({
      url: `${baseUrl.replace(/\/$/, '')}/prerregistro/${token}`,
      expiry: expiry.toISOString(),
    }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : 'Error inesperado.' }, { status: 500, headers: corsHeaders })
  }
})
