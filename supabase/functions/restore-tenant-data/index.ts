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

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
    return json({ error: 'arquivo de backup inválido ou corrompido' }, 400)
  }

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) {
    return json({ error: 'arquivo de backup inválido: manifest.json ausente' }, 400)
  }

  let manifest: { tenant_id?: string }
  try {
    manifest = JSON.parse(await manifestFile.async('string'))
  } catch {
    return json({ error: 'arquivo de backup inválido: manifest.json corrompido' }, 400)
  }

  if (manifest.tenant_id !== tenantId) {
    return json({ error: 'este backup pertence a outra imobiliária' }, 400)
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
    const { error: wipeError } = await adminClient.rpc('restore_tenant_data_wipe', {
      p_tenant_id: tenantId,
    })
    if (wipeError) {
      return json({ error: `falha ao limpar dados atuais: ${wipeError.message}` }, 400)
    }

    for (const table of INSERT_ORDER) {
      const dataFile = zip.file(`data/${table}.json`)
      if (!dataFile) continue

      let rows: unknown[]
      try {
        rows = JSON.parse(await dataFile.async('string'))
      } catch {
        return json({ error: `dados de ${table} corrompidos no arquivo de backup` }, 400)
      }
      if (!Array.isArray(rows) || rows.length === 0) continue

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { error: insertError } = await adminClient.from(table).insert(batch)
        if (insertError) {
          return json(
            { error: `falha ao restaurar ${table}: ${insertError.message}` },
            400,
          )
        }
      }
    }

    for (const bucketId of STORAGE_BUCKETS) {
      const bucket = adminClient.storage.from(bucketId)

      const existing = await listAllFiles(bucket, tenantId)
      for (let i = 0; i < existing.length; i += BATCH_SIZE) {
        await bucket.remove(existing.slice(i, i + BATCH_SIZE))
      }

      const prefix = `files/${bucketId}/`
      const entries = Object.values(zip.files).filter((f) => !f.dir && f.name.startsWith(prefix))
      for (const entry of entries) {
        const relativePath = entry.name.slice(prefix.length)
        const bytes = await entry.async('uint8array')
        const { error: uploadError } = await bucket.upload(`${tenantId}/${relativePath}`, bytes, {
          upsert: true,
        })
        if (uploadError) {
          return json(
            { error: `falha ao restaurar arquivo ${relativePath}: ${uploadError.message}` },
            400,
          )
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
