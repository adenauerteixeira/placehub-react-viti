// Cria o primeiro (ou mais um) tenant_admin de um tenant via Admin API.
// Só pode ser chamada por um usuário autenticado com role super_admin —
// verificado aqui dentro, não confiar no client. Ver ARCHITECTURE.md.
//
// handle_new_user() (migration inicial) já cria o profile certo sozinho
// quando raw_user_meta_data tem tenant_id/role, então esta função só
// precisa chamar auth.admin.createUser() com o metadata correto.

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
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'super_admin') {
    return json({ error: 'apenas super_admin pode criar administradores de tenant' }, 403)
  }

  let body: { tenant_id?: string; email?: string; password?: string; full_name?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }

  const { tenant_id, email, password, full_name } = body
  if (!tenant_id || !email || !password) {
    return json({ error: 'tenant_id, email e password são obrigatórios' }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'a senha precisa ter pelo menos 8 caracteres' }, 400)
  }

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('id', tenant_id)
    .single()

  if (!tenant) {
    return json({ error: 'tenant não encontrado' }, 404)
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tenant_id, role: 'tenant_admin', full_name: full_name || null },
  })

  if (createError) {
    const message = createError.message.includes('already been registered')
      ? 'Já existe um usuário com esse e-mail.'
      : createError.message
    return json({ error: message }, 400)
  }

  // Best-effort — o e-mail de boas-vindas nunca deve impedir a criação da
  // conta, que já aconteceu com sucesso acima.
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'welcome', user_id: created.user.id }),
    })
  } catch {
    // ignora — a conta já foi criada
  }

  return json({ user: { id: created.user.id, email: created.user.email } })
})
