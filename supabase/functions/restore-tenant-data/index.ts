// Restauração de backup do tenant (ver backup-tenant-data pra como o .zip é
// gerado) — apaga TODOS os dados de negócio/cadastro atuais do tenant
// (public.restore_tenant_data_wipe, migration
// 20260907140000_add_restore_tenant_data_wipe.sql) e recria a partir do
// arquivo enviado, preservando os ids originais (é isso que mantém as
// referências entre tabelas íntegras). Reinsere também os arquivos
// (catalog-media/sale-documents) sob o prefixo {tenant_id}/. Só
// tenant_admin, só o próprio tenant (nunca o tenant_id do manifest do
// arquivo), e só depois de reautenticar com a própria senha — mesmo padrão
// de reset-tenant-data, mas aqui a "reversão" é o arquivo, não um estado
// vazio.

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

// Pais antes de filhos — respeita as FKs no insert (o "on delete" das
// migrations não protege inserção, só exclusão).
const INSERT_ORDER = [
  'developments',
  'partners',
  'brokers',
  'owners',
  'announcements',
  'announcement_images',
  'announcement_amenities',
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

const BATCH_SIZE = 500
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
const MAX_ARCHIVE_ENTRIES = 5_000
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024

type RestoreTable = (typeof INSERT_ORDER)[number]
type RestoreData = Record<RestoreTable, unknown[]>
type RestoreFile = { bucketId: (typeof STORAGE_BUCKETS)[number]; relativePath: string; bytes: Uint8Array }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function archiveError(message: string): Error {
  return new Error(`arquivo de backup inválido: ${message}`)
}

/** Lê e valida TODO o conteúdo que será usado antes de a restauração apagar
 * qualquer registro. A transação no RPC protege o banco de falhas posteriores;
 * estes limites protegem a Edge Function de ZIPs maliciosos ou acidentais. */
async function parseBackupArchive(file: File, tenantId: string): Promise<{ data: RestoreData; files: RestoreFile[] }> {
  if (file.size === 0 || file.size > MAX_ARCHIVE_BYTES) {
    throw archiveError('o arquivo deve ter no máximo 50 MB')
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: true, createFolders: false })
  } catch {
    throw archiveError('arquivo corrompido')
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir)
  if (entries.length === 0 || entries.length > MAX_ARCHIVE_ENTRIES) {
    throw archiveError('quantidade de arquivos fora do limite permitido')
  }

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw archiveError('manifest.json ausente')

  let manifest: Record<string, unknown>
  try {
    const text = await manifestFile.async('string')
    if (text.length > 1024 * 1024) throw archiveError('manifesto grande demais')
    const parsed: unknown = JSON.parse(text)
    if (!isRecord(parsed)) throw archiveError('manifesto corrompido')
    manifest = parsed
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('arquivo de backup inválido:')) throw error
    throw archiveError('manifesto corrompido')
  }

  if (manifest.version !== 1 || manifest.tenant_id !== tenantId) {
    throw archiveError('não pertence a esta imobiliária ou usa uma versão incompatível')
  }
  if (!Array.isArray(manifest.tables) || INSERT_ORDER.some((table) => !manifest.tables.includes(table))) {
    throw archiveError('manifesto não contém todas as tabelas obrigatórias')
  }

  let uncompressedBytes = 0
  const consume = (bytes: number) => {
    uncompressedBytes += bytes
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      throw archiveError('conteúdo descompactado acima do limite de 100 MB')
    }
  }

  const data = {} as RestoreData
  for (const table of INSERT_ORDER) {
    const dataFile = zip.file(`data/${table}.json`)
    if (!dataFile) throw archiveError(`dados de ${table} ausentes`)

    let text: string
    try {
      text = await dataFile.async('string')
    } catch {
      throw archiveError(`dados de ${table} corrompidos`)
    }
    consume(new TextEncoder().encode(text).byteLength)

    let rows: unknown
    try {
      rows = JSON.parse(text)
    } catch {
      throw archiveError(`dados de ${table} não são JSON válido`)
    }
    if (!Array.isArray(rows)) throw archiveError(`dados de ${table} devem ser uma lista`)
    data[table] = rows
  }

  for (const table of INSERT_ORDER) {
    if (table === 'announcement_amenities') continue
    if (data[table].some((row) => !isRecord(row) || row.tenant_id !== tenantId)) {
      throw archiveError(`dados de ${table} não pertencem a esta imobiliária`)
    }
  }

  const announcementIds = new Set(
    data.announcements.filter(isRecord).map((row) => row.id).filter((id): id is string => typeof id === 'string'),
  )
  if (data.announcement_amenities.some((row) => !isRecord(row) || !announcementIds.has(String(row.announcement_id)))) {
    throw archiveError('amenidades referenciam anúncios inexistentes')
  }

  const files: RestoreFile[] = []
  for (const entry of entries) {
    if (!entry.name.startsWith('files/')) continue
    const [, bucketId, ...path] = entry.name.split('/')
    const relativePath = path.join('/')
    if (!STORAGE_BUCKETS.includes(bucketId as (typeof STORAGE_BUCKETS)[number]) || !relativePath || relativePath.includes('..') || relativePath.includes('\\')) {
      throw archiveError(`caminho de arquivo inválido: ${entry.name}`)
    }
    const bytes = await entry.async('uint8array')
    consume(bytes.byteLength)
    files.push({ bucketId: bucketId as (typeof STORAGE_BUCKETS)[number], relativePath, bytes })
  }

  return { data, files }
}

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
    return json({ error: 'só o administrador da imobiliária pode restaurar um backup' }, 403)
  }

  const tenantId: string = callerProfile.tenant_id

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }

  const password = form.get('password')
  const file = form.get('file')
  if (typeof password !== 'string' || !password) {
    return json({ error: 'senha é obrigatória' }, 400)
  }
  if (!(file instanceof File)) {
    return json({ error: 'arquivo de backup é obrigatório' }, 400)
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

  let backup: { data: RestoreData; files: RestoreFile[] }
  try {
    backup = await parseBackupArchive(file, tenantId)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'arquivo de backup inválido' }, 400)
  }

  // A partir daqui a operação é destrutiva de verdade — trava a tela de
  // todo mundo do tenant só agora (uma senha errada ou um zip inválido não
  // deveriam travar ninguém). O finally garante que destrava mesmo se algo
  // falhar no meio.
  await adminClient.from('tenant_maintenance_state').upsert({
    tenant_id: tenantId,
    active: true,
    reason: 'restore',
    message: 'Restaurando backup — não feche nem atualize a página.',
    started_at: new Date().toISOString(),
  })

  try {
    // A função SQL recebe o conjunto já validado e faz wipe + inserts em UMA
    // transação. Se uma FK, trigger ou dado inesperado falhar, o Postgres
    // desfaz inclusive o wipe — nunca fica um tenant parcialmente apagado.
    const { error: restoreError } = await adminClient.rpc('restore_tenant_data', {
      p_tenant_id: tenantId,
      p_data: backup.data,
    })
    if (restoreError) {
      return json({ error: `falha ao restaurar dados: ${restoreError.message}` }, 400)
    }

    // Arquivos não participam de transação no Storage. Só removemos mídia
    // antiga depois que todos os uploads novos e a transação de banco deram
    // certo; uma falha preserva os objetos existentes para uma nova tentativa.
    for (const bucketId of STORAGE_BUCKETS) {
      const bucket = adminClient.storage.from(bucketId)
      const restored = backup.files.filter((file) => file.bucketId === bucketId)
      for (const file of restored) {
        const { error: uploadError } = await bucket.upload(`${tenantId}/${file.relativePath}`, file.bytes, {
          upsert: true,
        })
        if (uploadError) {
          return json(
            { error: `dados restaurados, mas falhou ao restaurar arquivo ${file.relativePath}: ${uploadError.message}` },
            400,
          )
        }
      }

      const restoredPaths = new Set(restored.map((file) => `${tenantId}/${file.relativePath}`))
      const existing = await listAllFiles(bucket, tenantId)
      const stale = existing.filter((path) => !restoredPaths.has(path))
      for (let i = 0; i < stale.length; i += BATCH_SIZE) {
        const { error: removeError } = await bucket.remove(stale.slice(i, i + BATCH_SIZE))
        if (removeError) {
          return json({ error: `dados restaurados, mas falhou ao limpar mídia antiga: ${removeError.message}` }, 400)
        }
      }
    }

    return json({ ok: true })
  } finally {
    await adminClient
      .from('tenant_maintenance_state')
      .upsert({ tenant_id: tenantId, active: false })
  }
})
