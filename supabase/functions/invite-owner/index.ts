import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type InviteOwnerPayload = {
  email?: string
  plan_id?: string
}

const APP_URL = 'https://inn.tekmi.co'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return Response.json({ message: 'Método no permitido.' }, { status: 405, headers: corsHeaders })
  }

  const authorization = req.headers.get('Authorization') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  // Verify caller identity using their JWT
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })

  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) {
    return Response.json({ message: 'No autorizado.' }, { status: 401, headers: corsHeaders })
  }

  // All DB and admin operations use service_role — never anon key
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  let body: InviteOwnerPayload
  try {
    body = await req.json()
  } catch {
    return Response.json({ message: 'Body JSON inválido.' }, { status: 400, headers: corsHeaders })
  }

  const email = String(body?.email || '').trim().toLowerCase()
  const planId = String(body?.plan_id || '').trim()

  // Step 1: Validate required fields
  if (!email || !planId) {
    return Response.json(
      { message: 'email y plan_id son obligatorios.' },
      { status: 400, headers: corsHeaders },
    )
  }

  // Step 2: Verify plan exists and is active
  const { data: plan, error: planError } = await adminClient
    .from('plans')
    .select('id')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle()

  if (planError) {
    return Response.json({ message: planError.message }, { status: 500, headers: corsHeaders })
  }
  if (!plan) {
    return Response.json({ message: 'Plan no encontrado o inactivo.' }, { status: 404, headers: corsHeaders })
  }

  // Step 3: Create account in pending state
  const tempSlug = `pending-${crypto.randomUUID()}`
  const { data: account, error: accountError } = await adminClient
    .from('accounts')
    .insert({ name: 'Pending', slug: tempSlug, status: 'pending' })
    .select('id')
    .single()

  if (accountError || !account) {
    return Response.json(
      { message: `Error al crear la cuenta: ${accountError?.message ?? 'sin datos'}` },
      { status: 500, headers: corsHeaders },
    )
  }

  const accountId = account.id

  // Rollback helper: delete account and any child records created after step 3
  const rollback = async () => {
    await adminClient.from('account_users').delete().eq('account_id', accountId)
    await adminClient.from('account_plans').delete().eq('account_id', accountId)
    await adminClient.from('accounts').delete().eq('id', accountId)
  }

  // Step 4: Assign plan to account
  const { error: planAssignError } = await adminClient
    .from('account_plans')
    .insert({ account_id: accountId, plan_id: planId, assigned_by: user.id })

  if (planAssignError) {
    await rollback()
    return Response.json(
      { message: `Error al asignar el plan: ${planAssignError.message}` },
      { status: 500, headers: corsHeaders },
    )
  }

  // Step 5: Send invitation email to the operator
  const { data: invitedData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${APP_URL}/onboarding` },
  )

  if (inviteError || !invitedData?.user?.id) {
    await rollback()
    return Response.json(
      { message: `Error al enviar la invitación: ${inviteError?.message ?? 'sin user_id'}` },
      { status: 500, headers: corsHeaders },
    )
  }

  const invitedUserId = invitedData.user.id

  // Step 6: Create owner membership in pending state
  const { error: membershipError } = await adminClient
    .from('account_users')
    .insert({
      account_id: accountId,
      user_id: invitedUserId,
      role: 'admin',
      is_owner: true,
      status: 'pending',
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    })

  if (membershipError) {
    await rollback()
    return Response.json(
      { message: `Error al crear membresía: ${membershipError.message}` },
      { status: 500, headers: corsHeaders },
    )
  }

  // Step 7: Return created account
  return Response.json({ account_id: accountId }, { status: 200, headers: corsHeaders })
})
