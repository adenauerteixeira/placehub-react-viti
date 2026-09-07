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
// download, sobe pro bucket privado tenant-backups/{tenant_id}/ e podadados
// mais antigos além da retenção.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import JSZip from 'npm:jszip@3.10.1'

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

async function buildBackupZip(
  adminClient: ReturnType<typeof createClient>,
  tenantId: string,
  tenantSlug: string,
  tenantName: string,
): Promise<Uint8Array> {
  const zip = new JSZip()
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
    zip.file(`data/${table}.json`, JSON.stringify(rows))
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
    tenant_slug: tenantSlug,
    tenant_name: tenantName,
    generated_at: new Date().toISOString(),
    tables: [...TENANT_TABLES, 'announcement_amenities'],
    counts,
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'uint8array' })
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

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return json({ error: 'não autorizado' }, 401)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

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
  // backup-tenant-data (backup manual real de ~150MB levou ~53s), então em
  // vez de depender de um comportamento de background não confiável, o
  // pg_net é quem espera mais (timeout_milliseconds alto na migration) —
  // ver 20260907150000_add_backup_schedules_and_maintenance_state.sql.
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
      const bytes = await buildBackupZip(adminClient, tenantId, tenant.slug, tenant.name)
      const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
      const path = `${tenantId}/${fileName}`

      const { error: uploadError } = await adminClient.storage
        .from('tenant-backups')
        .upload(path, bytes, { contentType: 'application/zip' })
      if (uploadError) throw new Error(`falha ao salvar backup: ${uploadError.message}`)

      const bucket = adminClient.storage.from('tenant-backups')
      const existing = await listAllFiles(bucket, tenantId)
      const toRemove = existing.sort().slice(0, Math.max(0, existing.length - RETENTION_LIMIT))
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
