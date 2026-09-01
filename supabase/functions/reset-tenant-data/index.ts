// Reset de dados do tenant (ver migration reset_tenant_commercial_data) —
// só tenant_admin, e só depois de reautenticar com a própria senha aqui
// dentro (não dá pra pular clicando direto no botão: quem chama isto
// precisa da senha de verdade). tenant_id nunca vem do client — é sempre
// o do perfil de quem chamou, então um tenant_admin só consegue resetar o
// próprio tenant.

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

  if (userError || !user || !user.email) {
    return json({ error: 'não autenticado' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.tenant_id || callerProfile.role !== 'tenant_admin') {
    return json({ error: 'só o administrador da imobiliária pode resetar dados' }, 403)
  }

  let body: { password?: string; scope?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }

  const { password, scope } = body
  if (!password) {
    return json({ error: 'senha é obrigatória' }, 400)
  }
  if (scope !== 'funnel' && scope !== 'funnel_and_announcements') {
    return json({ error: 'escopo inválido' }, 400)
  }

  // Reautentica com a senha informada — se errar, dá erro e não muda nada.
  // Cliente descartável (chave anônima), a sessão criada aqui nunca é
  // devolvida nem persistida.
  const checkClient = createClient(supabaseUrl, anonKey)
  const { error: passwordError } = await checkClient.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (passwordError) {
    return json({ error: 'senha incorreta' }, 401)
  }

  const { error: resetError } = await adminClient.rpc('reset_tenant_commercial_data', {
    p_tenant_id: callerProfile.tenant_id,
    p_include_announcements: scope === 'funnel_and_announcements',
  })

  if (resetError) {
    return json({ error: resetError.message }, 400)
  }

  return json({ ok: true })
})
