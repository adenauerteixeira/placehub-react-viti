// Executa os backups automáticos agendados (tenant_backup_schedules) —
// disparada pelo pg_cron a cada 5 minutos via pg_net (ver migration
// 20260907150000_add_backup_schedules_and_maintenance_state.sql), não por
// um usuário logado. Por isso a autenticação aqui não é um JWT de sessão:
// é a própria Service Role Key do projeto, comparada por igualdade —
// "Enforce JWT Verification" tem que estar DESLIGADO nesta função no
// dashboard, senão o gateway barra a chamada do pg_net antes de chegar
// aqui.
//
// Mesma lógica de exportação de tabelas/arquivos de backup-tenant-data,
// duplicada aqui (cada Edge Function é colada isolada no dashboard, sem
// import compartilhado entre elas). Diferença: em vez de devolver o zip pra
// download, sobe pro bucket privado tenant-backups/{tenant_id}/ e poda
// dados mais antigos além da retenção.
//
// O zip é montado em streaming (jsr:@zip-js/zip-js): os downloads dos
// buckets de origem e a escrita de cada entrada nunca materializam mais de
// um arquivo por vez em memória — a versão anterior (JSZip + generateAsync)
// foi o que causou o incidente de 2026-09-07: um backup agendado estourou o
// limite de memória da Edge Function, o processo morreu antes do finally
// rodar, e tenant_maintenance_state ficou travado (tela de manutenção presa)
// por mais de 20 minutos até destravar manualmente. healStaleLocks() abaixo
// é a segunda camada de proteção contra essa mesma falha: se uma execução
// morrer de um jeito que nem isso evita (falha de infra literal), o próximo
// tick do cron destrava sozinho em vez de precisar de intervenção manual.
//
// O upload final pro Storage junta o zip inteiro num Uint8Array (testado em
// produção: o endpoint de upload simples exige Content-Length conhecido de
// antemão, não aceita corpo em stream — só o resumable/TUS aceitaria tamanho
// desconhecido, fora do escopo desse fix) e sobe em partes de até
// MAX_PART_BYTES: o projeto está no plano Free do Supabase, que trava o
// upload de qualquer arquivo em 50MB por objeto no nível da conta — bem
// abaixo do file_size_limit de 200MB configurado no bucket tenant-backups,
// e é o teto real (testado também: a API rejeita subir esse limite da conta
// sem upgrade pra plano pago). RecentBackupsList no frontend reagrupa as
// partes (nome.zip.part001, .part002, ...) e reconstitui o arquivo original
// na hora do download.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { configure, TextReader, ZipWriter } from 'jsr:@zip-js/zip-js@2.11.4'

configure({ useWebWorkers: false })

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

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
const RETENTION_LIMIT = 10

// Margem sob o teto de 50MB por objeto do plano Free do Supabase (ver
// comentário no topo do arquivo).
const MAX_PART_BYTES = 45 * 1024 * 1024

// Um lock (tenant_maintenance_state.active=true) mais velho que isso é
// considerado órfão de uma execução que morreu no meio — o backup manual de
// referência (~150MB) levou ~53s, então 10min já é bem folgado mesmo pra
// tenants maiores, sem arriscar destravar um backup ainda legitimamente em
// andamento.
const STALE_LOCK_MINUTES = 10

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

// Lê o stream de saída do zip até o fim e concatena num Uint8Array só.
// Testado em produção: o endpoint de upload simples do Storage exige um
// Content-Length conhecido de antemão (rejeita corpo em stream/chunked com
// "The object exceeded the maximum allowed size", mesmo bem abaixo do limite
// real do bucket) — só o resumable/TUS aceitaria tamanho desconhecido, e
// isso é escopo grande demais pra esse fix. Junta os bytes só nessa borda
// final; download dos buckets de origem e montagem do zip continuam em
// streaming, que é onde estava o grosso da duplicação de memória do bug
// original (cada arquivo baixado ficava em memória como Blob E como
// ArrayBuffer dentro do JSZip, pra todos os arquivos ao mesmo tempo, antes
// do generateAsync final).
async function collectStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    total += value.byteLength
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

// zipWriter e a leitura do stream de saída rodam concorrentes (o
// TransformStream entre os dois só drena quando algo lê o lado readable) —
// dar await num antes de começar o outro trava as duas pontas esperando uma
// a outra pra sempre.
//
// fileName é o nome lógico do backup (sem sufixo de parte) — cada parte sobe
// como "{fileName}.partNNN", numeradas a partir de 001. contentType de cada
// parte fica "application/zip" (o bucket só permite esse mime type; uma
// parte isolada não é um zip válido, mas isso é só o rótulo do objeto, não
// afeta os bytes).
async function buildAndUploadBackup(
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
  tenantId: string,
  tenantSlug: string,
  tenantName: string,
  fileName: string,
): Promise<void> {
  const zipFileStream = new TransformStream<Uint8Array, Uint8Array>()
  const zipWriter = new ZipWriter(zipFileStream.writable)

  const writeTask = writeBackupEntries(
    zipWriter,
    adminClient,
    supabaseUrl,
    serviceRoleKey,
    tenantId,
    tenantSlug,
    tenantName,
  )
    .then(() => zipWriter.close())
    .catch(async (error) => {
      await zipFileStream.writable.abort(error).catch(() => {})
      throw error
    })

  const [bytes] = await Promise.all([collectStream(zipFileStream.readable), writeTask])

  const totalParts = Math.max(1, Math.ceil(bytes.byteLength / MAX_PART_BYTES))
  for (let i = 0; i < totalParts; i++) {
    const start = i * MAX_PART_BYTES
    const part = bytes.subarray(start, Math.min(start + MAX_PART_BYTES, bytes.byteLength))
    const partName = `${fileName}.part${String(i + 1).padStart(3, '0')}`
    const { error: uploadError } = await adminClient.storage
      .from('tenant-backups')
      .upload(`${tenantId}/${partName}`, part, { contentType: 'application/zip' })
    if (uploadError) {
      throw new Error(`falha ao salvar parte ${i + 1}/${totalParts} do backup: ${uploadError.message}`)
    }
  }
}

// Dia da semana (0=domingo..6=sábado) e "HH:mm" atuais em America/Sao_Paulo
// — mesma convenção de tenant_backup_schedules.day_of_week (extract(dow)).
function nowInSaoPaulo(): { dayOfWeek: number; hhmm: string; dateKey: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const hour = get('hour') === '24' ? '00' : get('hour')

  return {
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
    hhmm: `${hour}:${get('minute')}`,
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Destrava sozinho um tenant_maintenance_state órfão (started_at mais velho
// que STALE_LOCK_MINUTES) — cobre qualquer origem do lock (backup manual,
// automático ou restore), não só o que essa function dispara. O filtro por
// started_at no update evita corrida com uma execução legítima que reiniciou
// o lock nesse meio-tempo (se started_at mudou, o update não bate em nada).
async function healStaleLocks(adminClient: ReturnType<typeof createClient>): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000).toISOString()
  const { data: stale } = await adminClient
    .from('tenant_maintenance_state')
    .select('tenant_id, reason, started_at')
    .eq('active', true)
    .lt('started_at', staleBefore)

  for (const row of stale ?? []) {
    console.error(
      `tenant_maintenance_state travado (tenant ${row.tenant_id}, reason ${row.reason}, iniciado ${row.started_at}) — destravando automaticamente após ${STALE_LOCK_MINUTES}min`,
    )
    await adminClient
      .from('tenant_maintenance_state')
      .update({ active: false })
      .eq('tenant_id', row.tenant_id)
      .eq('started_at', row.started_at)
  }
}

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return json({ error: 'não autorizado' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  await healStaleLocks(adminClient)

  const { dayOfWeek, hhmm, dateKey } = nowInSaoPaulo()
  const nowMinutes = timeToMinutes(hhmm)

  const { data: schedules, error: schedulesError } = await adminClient
    .from('tenant_backup_schedules')
    .select('id, tenant_id, time_of_day, last_run_at, tenants(slug, name)')
    .eq('active', true)
    .eq('day_of_week', dayOfWeek)

  if (schedulesError) {
    return json({ error: schedulesError.message }, 500)
  }

  const due = (schedules ?? []).filter((schedule: Record<string, unknown>) => {
    const timeOfDay = String(schedule.time_of_day).slice(0, 5) // "HH:mm:ss" -> "HH:mm"
    const scheduledMinutes = timeToMinutes(timeOfDay)
    const withinWindow = nowMinutes - scheduledMinutes >= 0 && nowMinutes - scheduledMinutes < 5
    const lastRunAt = schedule.last_run_at as string | null
    const alreadyRanToday = lastRunAt && lastRunAt.slice(0, 10) >= dateKey
    return withinWindow && !alreadyRanToday
  })

  // Processa sequencialmente e só responde no fim — testado com
  // EdgeRuntime.waitUntil() (responder logo e continuar em segundo plano),
  // mas na prática o trabalho em background nunca terminava (zip nem
  // aparecia no bucket depois de minutos, mesmo com EdgeRuntime.waitUntil
  // presente no runtime). O caminho síncrono é o mesmo já validado em
  // backup-tenant-data, então em vez de depender de um comportamento de
  // background não confiável, o pg_net é quem espera mais (timeout_milliseconds
  // alto na migration) — ver 20260907160000_increase_scheduled_backup_cron_timeout.sql.
  const ran: string[] = []
  const errors: string[] = []

  for (const schedule of due) {
    const tenantId = schedule.tenant_id as string
    const tenant = schedule.tenants as { slug: string; name: string } | null
    if (!tenant) continue

    await adminClient.from('tenant_maintenance_state').upsert({
      tenant_id: tenantId,
      active: true,
      reason: 'backup',
      message: 'Backup automático agendado em andamento...',
      started_at: new Date().toISOString(),
    })

    try {
      const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`

      await buildAndUploadBackup(
        adminClient,
        supabaseUrl,
        serviceRoleKey,
        tenantId,
        tenant.slug,
        tenant.name,
        fileName,
      )

      // Cada backup pode ter virado várias partes (ver MAX_PART_BYTES) — a
      // retenção conta backups lógicos, não objetos, então agrupa por nome
      // base (sem o sufixo .partNNN) antes de aplicar o limite.
      const bucket = adminClient.storage.from('tenant-backups')
      const existing = await listAllFiles(bucket, tenantId)
      const partsByBaseName = new Map<string, string[]>()
      for (const objectPath of existing) {
        const baseName = objectPath.replace(/\.part\d{3}$/, '')
        const parts = partsByBaseName.get(baseName) ?? []
        parts.push(objectPath)
        partsByBaseName.set(baseName, parts)
      }
      const baseNames = [...partsByBaseName.keys()].sort()
      const staleBaseNames = baseNames.slice(0, Math.max(0, baseNames.length - RETENTION_LIMIT))
      const toRemove = staleBaseNames.flatMap((baseName) => partsByBaseName.get(baseName)!)
      if (toRemove.length > 0) {
        await bucket.remove(toRemove)
      }

      await adminClient
        .from('tenant_backup_schedules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', schedule.id)

      ran.push(tenantId)
    } catch (error) {
      const message = error instanceof Error ? `${error.message}\n${error.stack}` : String(error)
      console.error(`backup agendado falhou pro tenant ${tenantId}:`, error)
      errors.push(`${tenantId}: ${message}`)
    } finally {
      await adminClient
        .from('tenant_maintenance_state')
        .upsert({ tenant_id: tenantId, active: false })
    }
  }

  return json({ ok: true, ran, errors })
})
