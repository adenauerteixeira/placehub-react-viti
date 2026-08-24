// Convida um novo usuário para o TENANT DE QUEM CHAMA (tenant_admin ou
// manager). tenant_id nunca vem do client — é sempre lido do profile de
// quem está autenticado, pra um tenant_admin não conseguir criar usuário
// em outro tenant só passando um id diferente no corpo da requisição.
// Ver create-tenant-admin/index.ts (mesmo padrão, escopo de plataforma).

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

const ASSIGNABLE_ROLES = new Set(['tenant_admin', 'manager', 'broker'])

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

  // Só tenant_admin — mesmo limite que a policy profiles_update já aplica
  // pra edição direta de outros usuários (RLS é a fonte de verdade aqui;
  // se um dia "manager" também puder gerenciar usuários, mudar os dois
  // juntos: esta checagem e a policy `profiles_update`).
  if (!callerProfile?.tenant_id || callerProfile.role !== 'tenant_admin') {
    return json({ error: 'sem permissão para convidar usuários' }, 403)
  }

  let body: {
    email?: string
    password?: string
    full_name?: string
    role?: string
    permissions?: string[]
    creci?: string
    creci_state?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }

  const { email, password, full_name, role, permissions, creci, creci_state } = body
  if (!email || !password || !role) {
    return json({ error: 'email, password e role são obrigatórios' }, 400)
  }
  if (!ASSIGNABLE_ROLES.has(role)) {
    return json({ error: 'role inválida' }, 400)
  }
  if (password.length < 8) {
    return json({ error: 'a senha precisa ter pelo menos 8 caracteres' }, 400)
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tenant_id: callerProfile.tenant_id, role, full_name: full_name || null },
  })

  if (createError) {
    const message = createError.message.includes('already been registered')
      ? 'Já existe um usuário com esse e-mail.'
      : createError.message
    return json({ error: message }, 400)
  }

  // handle_new_user() (trigger de criação do profile) só lê tenant_id/role/
  // full_name do metadata — creci/creci_state são preenchidos aqui depois,
  // já que a linha do profile só existe a partir deste ponto.
  if (creci || creci_state) {
    const { error: creciError } = await adminClient
      .from('profiles')
      .update({ creci: creci || null, creci_state: creci_state || null })
      .eq('id', created.user.id)
    if (creciError) {
      return json(
        { error: `Usuário criado, mas falha ao salvar CRECI: ${creciError.message}` },
        207,
      )
    }
  }

  if (permissions && permissions.length > 0) {
    const rows = permissions.map((permission_key) => ({
      profile_id: created.user.id,
      permission_key,
    }))
    const { error: permError } = await adminClient.from('profile_permissions').insert(rows)
    if (permError) {
      return json(
        { error: `Usuário criado, mas falha ao salvar permissões: ${permError.message}` },
        207,
      )
    }
  }

  return json({ user: { id: created.user.id, email: created.user.email } })
})
