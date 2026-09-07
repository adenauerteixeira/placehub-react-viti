// Backup dos dados do tenant — gera um .zip com o conteúdo de todas as
// tabelas de negócio/cadastro do tenant (ver escopo no manifest.json) mais
// os arquivos (fotos, comprovantes) guardados nos buckets catalog-media e
// sale-documents sob o prefixo {tenant_id}/. Não inclui usuários/contas nem
// identidade visual (bucket tenant-branding) — ver restore-tenant-data pra
// como isso volta. Só tenant_admin, e só os dados do próprio tenant
// (tenant_id nunca vem do client, é sempre o do perfil de quem chamou).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import JSZip from 'npm:jszip@3.10.1'

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

// Ordem não importa pra exportar (só importa pro restore, que reinsere
// respeitando as FKs) — aqui é só uma lista do que faz parte do backup.
const TENANT_TABLES = [
  'developments',
  'partners',
  'brokers',
  'owners',
  'announcements',
  'announcement_images',
  'tenant_banner_ads',
  'leads',
  'lead_follow_ups',
  'negotiations',
  'proposals',
  'sales',
  'sale_entry_installments',
  'sale_payment_assets',
  'commissions',
  'commission_installments',
  'reservations',
  'audit_logs',
] as const

const STORAGE_BUCKETS = ['catalog-media', 'sale-documents'] as const

async function listAllFiles(
  bucket: ReturnType<ReturnType<typeof createClient>['storage']['from']>,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = []

  async function walk(path: string) {
    const { data, error } = await bucket.list(path, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error || !data) return
    for (const entry of data) {
      const fullPath = path ? `${path}/${entry.name}` : entry.name
      if (entry.id === null) {
        await walk(fullPath)
      } else {
        paths.push(fullPath)
      }
    }
  }

  await walk(prefix)
  return paths
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

  if (!callerProfile?.tenant_id || callerProfile.role !== 'tenant_admin') {
    return json({ error: 'só o administrador da imobiliária pode gerar um backup' }, 403)
  }

  const tenantId: string = callerProfile.tenant_id

  // Trava a tela de todo mundo do tenant enquanto o backup roda — mesmo
  // sendo só leitura, decisão do produto foi travar nos dois casos (backup
  // e restore) pra não ter tratamento especial. O finally garante que isso
  // cai mesmo se algo der errado no meio.
  await adminClient.from('tenant_maintenance_state').upsert({
    tenant_id: tenantId,
    active: true,
    reason: 'backup',
    message: 'Gerando backup dos dados...',
    started_at: new Date().toISOString(),
  })

  try {
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('slug, name')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return json({ error: 'imobiliária não encontrada' }, 400)
    }

    const zip = new JSZip()
    const counts: Record<string, number> = {}
    let announcementIds: string[] = []

    for (const table of TENANT_TABLES) {
      const { data, error } = await adminClient.from(table).select('*').eq('tenant_id', tenantId)
      if (error) {
        return json({ error: `falha ao exportar ${table}: ${error.message}` }, 400)
      }
      const rows = data ?? []
      if (table === 'announcements') {
        announcementIds = rows.map((row: { id: string }) => row.id)
      }
      counts[table] = rows.length
      zip.file(`data/${table}.json`, JSON.stringify(rows))
    }

    // announcement_amenities não tem tenant_id — deriva dos anúncios já
    // exportados acima.
    let amenityRows: unknown[] = []
    if (announcementIds.length > 0) {
      const { data, error } = await adminClient
        .from('announcement_amenities')
        .select('*')
        .in('announcement_id', announcementIds)
      if (error) {
        return json({ error: `falha ao exportar announcement_amenities: ${error.message}` }, 400)
      }
      amenityRows = data ?? []
    }
    counts['announcement_amenities'] = amenityRows.length
    zip.file('data/announcement_amenities.json', JSON.stringify(amenityRows))

    for (const bucketId of STORAGE_BUCKETS) {
      const bucket = adminClient.storage.from(bucketId)
      const paths = await listAllFiles(bucket, tenantId)
      for (const path of paths) {
        const { data: fileData, error: downloadError } = await bucket.download(path)
        if (downloadError || !fileData) continue
        const relativePath = path.slice(tenantId.length + 1)
        zip.file(`files/${bucketId}/${relativePath}`, await fileData.arrayBuffer())
      }
    }

    const manifest = {
      version: 1,
      tenant_id: tenantId,
      tenant_slug: tenant.slug,
      tenant_name: tenant.name,
      generated_at: new Date().toISOString(),
      tables: [...TENANT_TABLES, 'announcement_amenities'],
      counts,
    }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))

    const bytes = await zip.generateAsync({ type: 'uint8array' })

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="backup-${tenant.slug}.zip"`,
      },
    })
  } finally {
    await adminClient
      .from('tenant_maintenance_state')
      .upsert({ tenant_id: tenantId, active: false })
  }
})
