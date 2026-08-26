// Dispara os e-mails transacionais do sistema via Resend: boas-vindas (conta
// criada), nova reserva (confirmação pro cliente), comissão liberada (aviso
// pro corretor confirmar recebimento) e recibo de pagamento (parcela de
// venda recebida). Um único function porque os 4 tipos compartilham o mesmo
// envelope (identidade visual do tenant) e a mesma chamada à API do Resend —
// ver ARCHITECTURE.md.
//
// Best-effort: falha de envio nunca deve derrubar a ação principal (reserva,
// pagamento, criação de conta) que disparou o e-mail — por isso os 3 pontos
// de chamada no client/outras functions tratam erro daqui como não-fatal.
//
// Autorização: "welcome" só é aceito quando o chamador é o próprio projeto
// (Authorization = service role key), porque é disparado de dentro de
// create-tenant-admin/invite-tenant-user antes de existir sessão de usuário
// pro novo cadastro. Os outros 3 tipos exigem uma sessão de usuário comum
// cujo tenant_id bate com o tenant dono do registro referenciado — sem essa
// checagem, qualquer usuário autenticado poderia usar installment_id/
// reservation_id de outro tenant pra ler dados ou disparar e-mail pra
// terceiros.

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

type TenantBranding = {
  id: string
  name: string
  slug: string
  primary_color: string
  logo_light_path: string | null
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function loginUrl(slug: string) {
  const rootDomain = Deno.env.get('ROOT_DOMAIN') ?? 'placehub.app'
  return `https://${slug}.${rootDomain}/login`
}

function emailShell(tenant: TenantBranding, supabaseUrl: string, title: string, bodyHtml: string) {
  const logoUrl = tenant.logo_light_path
    ? `${supabaseUrl}/storage/v1/object/public/tenant-branding/${tenant.logo_light_path}`
    : null

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:${tenant.primary_color};padding:20px 24px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${tenant.name}" height="32" style="display:block;" />` : `<span style="color:#ffffff;font-size:18px;font-weight:bold;">${tenant.name}</span>`}
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#18181b;">
                <h1 style="font-size:18px;margin:0 0 16px;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;color:#71717a;font-size:12px;border-top:1px solid #e4e4e7;">
                ${tenant.name} — enviado automaticamente, não responda este e-mail.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendViaResend(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY/RESEND_FROM_EMAIL não configurados')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend respondeu ${res.status}: ${text}`)
  }
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
  const isServiceCall = authHeader === `Bearer ${serviceRoleKey}`
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  let body: {
    type?: 'welcome' | 'new_reservation' | 'commission_released' | 'payment_receipt'
    user_id?: string
    reservation_id?: string
    installment_id?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'corpo da requisição inválido' }, 400)
  }

  const { type } = body

  // "welcome" só pode ser disparado internamente (service role) — não existe
  // sessão de usuário pro destinatário no momento em que a conta é criada.
  if (type === 'welcome') {
    if (!isServiceCall) {
      return json({ error: 'tipo não permitido pra esta chamada' }, 403)
    }
    if (!body.user_id) {
      return json({ error: 'user_id é obrigatório' }, 400)
    }

    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(body.user_id)
    if (userError || !userData.user?.email) {
      return json({ error: 'usuário não encontrado' }, 404)
    }

    const tenantId = userData.user.user_metadata?.tenant_id as string | undefined
    if (!tenantId) {
      return json({ sent: false, reason: 'usuário sem tenant_id' })
    }

    const { data: tenant } = await adminClient
      .from('tenants')
      .select('id, name, slug, primary_color, logo_light_path')
      .eq('id', tenantId)
      .single<TenantBranding>()

    if (!tenant) {
      return json({ sent: false, reason: 'tenant não encontrado' })
    }

    const fullName = (userData.user.user_metadata?.full_name as string | undefined) || null
    const html = emailShell(
      tenant,
      supabaseUrl,
      `Bem-vindo(a) à ${tenant.name}!`,
      `<p>Olá${fullName ? `, ${fullName}` : ''}!</p>
       <p>Sua conta foi criada com o e-mail <strong>${userData.user.email}</strong>.</p>
       <p>A senha de acesso foi combinada com quem criou seu cadastro. Acesse o link abaixo pra entrar:</p>
       <p><a href="${loginUrl(tenant.slug)}" style="color:${tenant.primary_color};">${loginUrl(tenant.slug)}</a></p>`,
    )

    try {
      await sendViaResend(userData.user.email, `Bem-vindo(a) à ${tenant.name}`, html)
    } catch (err) {
      return json({ sent: false, reason: (err as Error).message }, 502)
    }
    return json({ sent: true })
  }

  // Demais tipos: exige sessão de usuário comum, e o tenant do registro
  // referenciado precisa bater com o tenant do usuário autenticado.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser()

  if (authError || !user) {
    return json({ error: 'não autenticado' }, 401)
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.tenant_id) {
    return json({ error: 'sem tenant associado' }, 403)
  }

  if (type === 'new_reservation') {
    if (!body.reservation_id) return json({ error: 'reservation_id é obrigatório' }, 400)

    const { data: reservation } = await adminClient
      .from('reservations')
      .select('id, tenant_id, customer_name, customer_email, reserved_at, expires_at, announcement_id')
      .eq('id', body.reservation_id)
      .single()

    if (!reservation || reservation.tenant_id !== callerProfile.tenant_id) {
      return json({ error: 'reserva não encontrada' }, 404)
    }
    if (!reservation.customer_email) {
      return json({ sent: false, reason: 'reserva sem e-mail de cliente' })
    }

    const { data: announcement } = await adminClient
      .from('announcements')
      .select('title')
      .eq('id', reservation.announcement_id)
      .single()

    const { data: tenant } = await adminClient
      .from('tenants')
      .select('id, name, slug, primary_color, logo_light_path')
      .eq('id', reservation.tenant_id)
      .single<TenantBranding>()

    if (!tenant) return json({ sent: false, reason: 'tenant não encontrado' })

    const html = emailShell(
      tenant,
      supabaseUrl,
      'Reserva confirmada',
      `<p>Olá, ${reservation.customer_name}!</p>
       <p>Sua reserva para <strong>${announcement?.title ?? 'o imóvel'}</strong> foi confirmada.</p>
       <p>Reservado em ${formatDate(reservation.reserved_at)}, válido até ${formatDate(reservation.expires_at)}.</p>
       <p>Em breve alguém da nossa equipe entra em contato pelos próximos passos.</p>`,
    )

    try {
      await sendViaResend(reservation.customer_email, `Reserva confirmada — ${tenant.name}`, html)
    } catch (err) {
      return json({ sent: false, reason: (err as Error).message }, 502)
    }
    return json({ sent: true })
  }

  if (type === 'commission_released') {
    if (!body.installment_id) return json({ error: 'installment_id é obrigatório' }, 400)

    const { data: installment } = await adminClient
      .from('commission_installments')
      .select('id, tenant_id, commission_id, number, broker_amount, broker_paid_at')
      .eq('id', body.installment_id)
      .single()

    if (!installment || installment.tenant_id !== callerProfile.tenant_id) {
      return json({ error: 'parcela não encontrada' }, 404)
    }

    const { data: commission } = await adminClient
      .from('commissions')
      .select('broker_id')
      .eq('id', installment.commission_id)
      .single()

    const { data: broker } = commission?.broker_id
      ? await adminClient.from('brokers').select('name, email').eq('id', commission.broker_id).single()
      : { data: null }

    if (!broker?.email) {
      return json({ sent: false, reason: 'corretor sem e-mail cadastrado' })
    }

    const { data: tenant } = await adminClient
      .from('tenants')
      .select('id, name, slug, primary_color, logo_light_path')
      .eq('id', installment.tenant_id)
      .single<TenantBranding>()

    if (!tenant) return json({ sent: false, reason: 'tenant não encontrado' })

    const html = emailShell(
      tenant,
      supabaseUrl,
      'Comissão liberada',
      `<p>Olá, ${broker.name}!</p>
       <p>A parcela nº ${installment.number} da sua comissão, no valor de
       <strong>${formatPrice(installment.broker_amount)}</strong>, foi registrada como paga
       ${installment.broker_paid_at ? `em ${formatDate(installment.broker_paid_at)}` : ''}.</p>
       <p>Acesse o sistema pra confirmar o recebimento:</p>
       <p><a href="${loginUrl(tenant.slug)}" style="color:${tenant.primary_color};">${loginUrl(tenant.slug)}</a></p>`,
    )

    try {
      await sendViaResend(broker.email, `Comissão liberada — ${tenant.name}`, html)
    } catch (err) {
      return json({ sent: false, reason: (err as Error).message }, 502)
    }
    return json({ sent: true })
  }

  if (type === 'payment_receipt') {
    if (!body.installment_id) return json({ error: 'installment_id é obrigatório' }, 400)

    const { data: installment } = await adminClient
      .from('sale_entry_installments')
      .select('id, tenant_id, sale_id, number, amount, received_at, payment_method')
      .eq('id', body.installment_id)
      .single()

    if (!installment || installment.tenant_id !== callerProfile.tenant_id) {
      return json({ error: 'parcela não encontrada' }, 404)
    }

    const { data: sale } = await adminClient
      .from('sales')
      .select('negotiation_id')
      .eq('id', installment.sale_id)
      .single()

    const { data: negotiation } = sale?.negotiation_id
      ? await adminClient.from('negotiations').select('lead_id').eq('id', sale.negotiation_id).single()
      : { data: null }

    const { data: lead } = negotiation?.lead_id
      ? await adminClient.from('leads').select('name, email').eq('id', negotiation.lead_id).single()
      : { data: null }

    if (!lead?.email) {
      return json({ sent: false, reason: 'lead sem e-mail cadastrado' })
    }

    const { data: tenant } = await adminClient
      .from('tenants')
      .select('id, name, slug, primary_color, logo_light_path')
      .eq('id', installment.tenant_id)
      .single<TenantBranding>()

    if (!tenant) return json({ sent: false, reason: 'tenant não encontrado' })

    const html = emailShell(
      tenant,
      supabaseUrl,
      'Recibo de pagamento',
      `<p>Olá, ${lead.name}!</p>
       <p>Confirmamos o recebimento da parcela nº ${installment.number}, no valor de
       <strong>${formatPrice(installment.amount)}</strong>${installment.received_at ? `, em ${formatDate(installment.received_at)}` : ''}${installment.payment_method ? ` (${installment.payment_method})` : ''}.</p>
       <p>Obrigado pela confiança!</p>`,
    )

    try {
      await sendViaResend(lead.email, `Recibo de pagamento — ${tenant.name}`, html)
    } catch (err) {
      return json({ sent: false, reason: (err as Error).message }, 502)
    }
    return json({ sent: true })
  }

  return json({ error: 'tipo desconhecido' }, 400)
})
