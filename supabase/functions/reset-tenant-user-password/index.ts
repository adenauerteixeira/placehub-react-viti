// Redefine a senha de um usuário do PRÓPRIO tenant de quem chama (ex.: corretor
// esqueceu a senha, tenant_admin redefine na tela de edição de usuário). Precisa
// da Admin API (auth.admin.updateUserById) porque não existe outro jeito de
// setar a senha de outra pessoa pelo client. Mesmo padrão de autorização de
// invite-tenant-user/index.ts e update-tenant-user-email/index.ts: tenant_id do
// alvo é sempre verificado aqui dentro, nunca confiado no client.

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
    return json({ error: 'sem permissão para redefinir senha de usuários' }, 403)
  }

  let body: { user_id?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }

  const { user_id, password } = body
  if (!user_id || !password) {
    return json({ error: 'user_id e password são obrigatórios' }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'a senha precisa ter pelo menos 8 caracteres' }, 400)
  }

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', user_id)
    .single()

  if (!targetProfile || targetProfile.tenant_id !== callerProfile.tenant_id) {
    return json({ error: 'usuário não pertence a esta imobiliária' }, 403)
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, { password })

  if (updateError) {
    return json({ error: updateError.message }, 400)
  }

  return json({ ok: true })
})
