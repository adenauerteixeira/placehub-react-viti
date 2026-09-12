// Cria um colaborador para o console da plataforma. O papel é fixo em
// super_admin e a autorização é verificada no servidor.
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'não autenticado' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'não autenticado' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: caller } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'super_admin') return json({ error: 'apenas super_admin pode criar usuários da plataforma' }, 403)

  let body: { email?: string; password?: string; full_name?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }
  if (!body.email || !body.password) return json({ error: 'e-mail e senha são obrigatórios' }, 400)
  if (body.password.length < 8) return json({ error: 'a senha precisa ter pelo menos 8 caracteres' }, 400)

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { role: 'super_admin', full_name: body.full_name?.trim() || null },
  })
  if (createError) {
    const message = createError.message.includes('already been registered')
      ? 'Já existe um usuário com esse e-mail.'
      : createError.message
    return json({ error: message }, 400)
  }

  return json({ user: { id: created.user.id, email: created.user.email } })
})
