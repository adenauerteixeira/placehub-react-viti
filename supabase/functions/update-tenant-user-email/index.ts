// Troca o e-mail de um usuário do PRÓPRIO tenant de quem chama. Precisa da
// Admin API (auth.admin.updateUserById) porque auth.users.email não pode
// ser alterado direto pelo client — profiles.email é só uma cópia
// denormalizada, mantida em sincronia por trigger em UPDATE OF email (ver
// 20260822160905_add_email_to_profiles.sql). Mesmo padrão de
// invite-tenant-user/index.ts: tenant_id do alvo é sempre verificado aqui
// dentro, nunca confiado no client.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'não autenticado' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return json({ error: 'não autenticado' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  // Mesmo limite de invite-tenant-user: só tenant_admin.
  if (!callerProfile?.tenant_id || callerProfile.role !== 'tenant_admin') {
    return json({ error: 'sem permissão para alterar e-mail de usuários' }, 403)
  }

  let body: { user_id?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }

  const { user_id, email } = body
  if (!user_id || !email) {
    return json({ error: 'user_id e email são obrigatórios' }, 400)
  }

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', user_id)
    .single()

  if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
    return json({ error: 'usuário não pertence a esta imobiliária' }, 403)
  }

  const { data: updated, error: updateError } = await adminClient.auth.admin.updateUserById(
    user_id,
    { email, email_confirm: true },
  )

  if (updateError) {
    const message = updateError.message.includes('already been registered')
      ? 'Já existe um usuário com esse e-mail.'
      : updateError.message
    return json({ error: message }, 400)
  }

  return json({ user: { id: updated.user.id, email: updated.user.email } })
})
