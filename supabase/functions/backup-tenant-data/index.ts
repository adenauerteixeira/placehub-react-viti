// Backup dos dados do tenant — gera um .zip com o conteúdo de todas as
// tabelas de negócio/cadastro do tenant (ver escopo no manifest.json) mais
// os arquivos (fotos, comprovantes) guardados nos buckets catalog-media e
// sale-documents sob o prefixo {tenant_id}/. Não inclui usuários/contas nem
// identidade visual (bucket tenant-branding) — ver restore-tenant-data pra
// como isso volta. Só tenant_admin, e só os dados do próprio tenant
// (tenant_id nunca vem do client, é sempre o do perfil de quem chamou).
//
// O zip é montado em streaming (jsr:@zip-js/zip-js) direto pro corpo da
// Response, sem nunca materializar o arquivo inteiro (nem os downloads dos
// buckets) em memória — a versão anterior (JSZip + generateAsync) estourava
// o limite de memória da Edge Function pra tenants com bastante mídia, o que
// matava o processo antes do finally rodar e deixava
// tenant_maintenance_state travado pra sempre (só recuperável pela válvula
// de escape do tenant_admin, ver a policy tenant_maintenance_state_admin_update).
// Os arquivos dos buckets são baixados via fetch cru no endpoint de Storage
// (não storage-js .download(), que já materializa um Blob inteiro) pra
// manter a entrada também em stream.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { configure, TextReader, ZipWriter } from 'jsr:@zip-js/zip-js@2.11.4'

configure({ useWebWorkers: false })

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

// bucket.download() do storage-js materializa um Blob inteiro em memória
// antes de devolver — baixa direto do endpoint de Storage pra manter o
// corpo como stream também na entrada do zip.
async function fetchObjectStream(
  supabaseUrl: string,
  serviceRoleKey: string,
  bucketId: string,
  path: string,
): Promise<ReadableStream<Uint8Array> | null> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucketId}/${encodedPath}`, {
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
  })
  if (!res.ok || !res.body) return null
  return res.body
}

async function writeBackupEntries(
  zipWriter: InstanceType<typeof ZipWriter>,
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  tenantId: string,
  tenantSlug: string,
  tenantName: string,
): Promise<void> {
  const counts: Record<string, number> = {}
  let announcementIds: string[] = []

  for (const table of TENANT_TABLES) {
    const { data, error } = await adminClient.from(table).select('*').eq('tenant_id', tenantId)
    if (error) throw new Error(`falha ao exportar ${table}: ${error.message}`)
    const rows = data ?? []
    if (table === 'announcements') {
      announcementIds = rows.map((row: { id: string }) => row.id)
    }
    counts[table] = rows.length
    // level: 0 (sem compressão) — os arquivos maiores (fotos) já vêm
    // comprimidos, e comprimir de novo só custa CPU pra pouco ganho.
    await zipWriter.add(`data/${table}.json`, new TextReader(JSON.stringify(rows)), { level: 0 })
  }

  // announcement_amenities não tem tenant_id — deriva dos anúncios já
  // exportados acima.
  let amenityRows: unknown[] = []
  if (announcementIds.length > 0) {
    const { data, error } = await adminClient
      .from('announcement_amenities')
      .select('*')
      .in('announcement_id', announcementIds)
    if (error) throw new Error(`falha ao exportar announcement_amenities: ${error.message}`)
    amenityRows = data ?? []
  }
  counts['announcement_amenities'] = amenityRows.length
  await zipWriter.add(
    'data/announcement_amenities.json',
    new TextReader(JSON.stringify(amenityRows)),
    { level: 0 },
  )

  for (const bucketId of STORAGE_BUCKETS) {
    const bucket = adminClient.storage.from(bucketId)
    const paths = await listAllFiles(bucket, tenantId)
    for (const path of paths) {
      const stream = await fetchObjectStream(supabaseUrl, serviceRoleKey, bucketId, path)
      if (!stream) continue
      const relativePath = path.slice(tenantId.length + 1)
      await zipWriter.add(`files/${bucketId}/${relativePath}`, stream, { level: 0 })
    }
  }

  const manifest = {
    version: 1,
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
    tenant_name: tenantName,
    generated_at: new Date().toISOString(),
    tables: [...TENANT_TABLES, 'announcement_amenities'],
    counts,
  }
  await zipWriter.add('manifest.json', new TextReader(JSON.stringify(manifest, null, 2)), {
    level: 0,
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

  if (!callerProfile?.tenant_id || callerProfile.role !== 'tenant_admin') {
    return json({ error: 'só o administrador da imobiliária pode gerar um backup' }, 403)
  }

  const tenantId: string = callerProfile.tenant_id

  const { data: tenant, error: tenantError } = await adminClient
    .from('tenants')
    .select('slug, name')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    return json({ error: 'imobiliária não encontrada' }, 400)
  }

  // Trava a tela de todo mundo do tenant enquanto o backup roda — mesmo
  // sendo só leitura, decisão do produto foi travar nos dois casos (backup
  // e restore) pra não ter tratamento especial. Só trava daqui pra frente,
  // depois que já sabemos que o tenant existe e o trabalho de verdade vai
  // começar.
  await adminClient.from('tenant_maintenance_state').upsert({
    tenant_id: tenantId,
    active: true,
    reason: 'backup',
    message: 'Gerando backup dos dados...',
    started_at: new Date().toISOString(),
  })

  const zipFileStream = new TransformStream<Uint8Array, Uint8Array>()
  const zipWriter = new ZipWriter(zipFileStream.writable)

  // Sem await aqui antes do "return": o TransformStream só drena (e a
  // escrita avança) quando alguém lê o lado readable, e é a própria Response
  // abaixo que faz essa leitura ao mandar pro cliente. Esperar o close()
  // antes de devolver a Response trava as duas pontas esperando uma a outra
  // pra sempre — bug documentado desse padrão de uso da lib.
  const writeTask = writeBackupEntries(
    zipWriter,
    adminClient,
    supabaseUrl,
    serviceRoleKey,
    tenantId,
    tenant.slug,
    tenant.name,
  )
    .then(() => zipWriter.close())
    .catch(async (error) => {
      console.error(`backup manual falhou pro tenant ${tenantId}:`, error)
      await zipFileStream.writable.abort(error).catch(() => {})
      throw error
    })

  const cleanup = writeTask.catch(() => {}).finally(() =>
    adminClient.from('tenant_maintenance_state').upsert({ tenant_id: tenantId, active: false }),
  )
  if (typeof EdgeRuntime !== 'undefined') {
    EdgeRuntime.waitUntil(cleanup)
  }

  return new Response(zipFileStream.readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="backup-${tenant.slug}.zip"`,
    },
  })
})
