import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type InvitePayload = {
  email?: string
  role?: 'admin' | 'manager' | 'staff' | ''
  account_id?: string
}

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase()
const normalizeRole = (value: unknown) => String(value || '').trim().toLowerCase()
const normalizeUuid = (value: unknown) => String(value || '').trim()

const roleLimits: Record<string, number> = {
  admin: 2,
  manager: 2,
  staff: 4,
}

const findAuthUserByEmail = async (
  adminClient: ReturnType<typeof createClient>,
  email: string,
) => {
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users || []
    const match = users.find((item) => String(item.email || '').toLowerCase() === email)
    if (match) return match

    if (users.length < perPage) return null
    page += 1
  }
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
    const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('VITE_APP_URL') || 'https://inn.tekmi.co').replace(/\/$/, '')

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

    const body = (await req.json()) as InvitePayload
    const email = normalizeEmail(body?.email)
    const role = normalizeRole(body?.role)
    const accountId = normalizeUuid(body?.account_id)

    if (!email || !role || !accountId) {
      return Response.json({ message: 'email, role y account_id son obligatorios.' }, { status: 400, headers: corsHeaders })
    }

    if (!roleLimits[role]) {
      return Response.json({ message: 'Rol inválido.' }, { status: 400, headers: corsHeaders })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: inviterMembership, error: inviterError } = await adminClient
      .from('account_users')
      .select('id, role, account_id')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (inviterError) throw inviterError

    if (!inviterMembership || inviterMembership.role !== 'admin') {
      return Response.json({ message: 'Solo un admin puede invitar usuarios.' }, { status: 403, headers: corsHeaders })
    }

    const existingAuthUser = await findAuthUserByEmail(adminClient, email)

    if (existingAuthUser) {
      const { data: duplicatedMembership, error: duplicatedMembershipError } = await adminClient
        .from('account_users')
        .select('id')
        .eq('account_id', accountId)
        .eq('user_id', existingAuthUser.id)
        .maybeSingle()

      if (duplicatedMembershipError) throw duplicatedMembershipError

      if (duplicatedMembership) {
        return Response.json({ message: 'Ese email ya está asociado a esta cuenta.' }, { status: 409, headers: corsHeaders })
      }
    }

    const { count: roleCount, error: roleCountError } = await adminClient
      .from('account_users')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('role', role)
      .in('status', ['active', 'pending'])

    if (roleCountError) throw roleCountError

    const maxSlots = roleLimits[role]
    const usedSlots = Number(roleCount || 0)
    if (usedSlots >= maxSlots) {
      return Response.json(
        { message: `Límite de ${role}s alcanzado (${maxSlots} por cuenta).`, role, limit: maxSlots },
        { status: 409, headers: corsHeaders },
      )
    }

    if (existingAuthUser) {
      const membershipPayload = {
        account_id: accountId,
        user_id: existingAuthUser.id,
        role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        status: existingAuthUser.email_confirmed_at ? 'active' : 'pending',
        is_owner: false,
      }

      const { error: insertExistingMembershipError } = await adminClient
        .from('account_users')
        .insert(membershipPayload)

      if (insertExistingMembershipError) throw insertExistingMembershipError

      return Response.json({ success: true, linked: true }, { headers: corsHeaders })
    }

    const { data: invitedData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { account_id: accountId, role },
      redirectTo: `${appUrl}/login`,
    })

    if (inviteError) {
      return Response.json({ message: inviteError.message }, { status: 400, headers: corsHeaders })
    }

    const invitedUserId = invitedData?.user?.id
    if (!invitedUserId) {
      return Response.json({ message: 'No se pudo crear la invitación.' }, { status: 500, headers: corsHeaders })
    }

    const membershipPayload = {
      account_id: accountId,
      user_id: invitedUserId,
      role,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      status: 'pending',
      is_owner: false,
    }

    const { error: insertMembershipError } = await adminClient
      .from('account_users')
      .insert(membershipPayload)

    if (insertMembershipError) throw insertMembershipError

    return Response.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Error inesperado.' },
      { status: 500, headers: corsHeaders },
    )
  }
})
