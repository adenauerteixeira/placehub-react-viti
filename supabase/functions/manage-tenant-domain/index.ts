// Provisiona e verifica domínios próprios no projeto Vercel da plataforma.
// O token da Vercel só existe nos secrets da Edge Function e cada requisição é
// autorizada novamente como super_admin.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/

type VercelDomain = {
  name: string
  verified: boolean
  verification?: Array<{ type?: string; domain?: string; value?: string; reason?: string }> | null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function vercelError(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && 'error' in body) {
    const error = (body as { error?: { message?: unknown } }).error
    if (typeof error?.message === 'string') return error.message
  }
  return fallback
}

async function readResponse(response: Response) {
  const text = await response.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }
  if (!response.ok) throw new Error(vercelError(body, `Vercel respondeu ${response.status}.`))
  return body
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'não autenticado' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vercelToken = Deno.env.get('VERCEL_ACCESS_TOKEN')
  const vercelProjectId = Deno.env.get('VERCEL_PROJECT_ID')
  const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID')
  if (!vercelToken || !vercelProjectId || !vercelTeamId) {
    return json({ error: 'Integração com a Vercel ainda não está configurada.' }, 503)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'não autenticado' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return json({ error: 'apenas super_admin pode configurar domínios' }, 403)

  let body: { action?: 'provision' | 'refresh'; tenant_id?: string; domain?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }
  if (!body.tenant_id || !['provision', 'refresh'].includes(body.action ?? '')) {
    return json({ error: 'tenant_id e action válidos são obrigatórios' }, 400)
  }

  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, custom_domain')
    .eq('id', body.tenant_id)
    .single()
  if (!tenant) return json({ error: 'imobiliária não encontrada' }, 404)

  const suppliedDomain = body.domain?.trim().toLowerCase()
  const domain = body.action === 'provision' ? suppliedDomain : tenant.custom_domain
  if (!domain || !DOMAIN_PATTERN.test(domain)) {
    return json({ error: 'Informe somente um domínio válido, sem protocolo, porta ou caminho.' }, 400)
  }
  if (tenant.custom_domain && tenant.custom_domain !== domain) {
    return json({ error: 'A substituição de um domínio já configurado exige uma ação específica.' }, 409)
  }

  const { data: assignedTenant } = await adminClient
    .from('tenants')
    .select('id')
    .eq('custom_domain', domain)
    .neq('id', tenant.id)
    .maybeSingle()
  if (assignedTenant) return json({ error: 'Esse domínio já está associado a outra imobiliária.' }, 409)

  const query = `?teamId=${encodeURIComponent(vercelTeamId)}`
  const encodedDomain = encodeURIComponent(domain)
  const projectDomainUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(vercelProjectId)}/domains/${encodedDomain}${query}`
  const headers = { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' }

  let projectDomain: VercelDomain
  try {
    const current = await fetch(projectDomainUrl, { headers })
    if (current.status === 404) {
      if (body.action === 'refresh') return json({ error: 'O domínio não está cadastrado no projeto Vercel.' }, 404)
      const added = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(vercelProjectId)}/domains${query}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: domain }),
      })
      projectDomain = await readResponse(added) as VercelDomain
    } else {
      projectDomain = await readResponse(current) as VercelDomain
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Não foi possível cadastrar o domínio na Vercel.' }, 502)
  }

  let verificationError: string | null = null
  if (!projectDomain.verified) {
    try {
      const verified = await fetch(`${projectDomainUrl}/verify`, { method: 'POST', headers })
      projectDomain = await readResponse(verified) as VercelDomain
    } catch (error) {
      // DNS pendente é esperado neste ponto. O usuário pode repetir "Verificar DNS" depois.
      verificationError = error instanceof Error ? error.message : 'A Vercel ainda não conseguiu verificar o DNS.'
    }
  }

  let configuration: unknown = null
  try {
    const config = await fetch(`https://api.vercel.com/v6/domains/${encodedDomain}/config${query}`, { headers })
    configuration = await readResponse(config)
  } catch (error) {
    verificationError ??= error instanceof Error ? error.message : 'Não foi possível obter a configuração DNS.'
  }

  const status = projectDomain.verified ? 'verified' : 'pending_dns'
  const { error: updateError } = await adminClient
    .from('tenants')
    .update({
      custom_domain: domain,
      custom_domain_status: status,
      custom_domain_config: configuration,
      custom_domain_checked_at: new Date().toISOString(),
      custom_domain_error: verificationError,
    })
    .eq('id', tenant.id)
  if (updateError) return json({ error: `Domínio cadastrado na Vercel, mas falha ao salvar: ${updateError.message}` }, 500)

  return json({ domain, status, configuration, verification: projectDomain.verification ?? null, message: verificationError })
})
