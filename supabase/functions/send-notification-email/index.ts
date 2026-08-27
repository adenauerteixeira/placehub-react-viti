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
  email_logo_path: string | null
  email_logo_background_color: string
  email_logo_background_transparent: boolean
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

/** Bloco de destaque pra um par rótulo/valor (e-mail de acesso, valor de uma
 * parcela, etc.) — mesmo cartão cinza-claro reaproveitado nos 4 tipos. */
function highlightBox(label: string, value: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #eef0f3;border-radius:10px;margin:0 0 28px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 2px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#8b8f99;">${label}</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#18181b;">${value}</p>
      </td>
    </tr>
  </table>`
}

/** Botão à prova de bugs em cliente de e-mail: cor de fundo no <td>, não no
 * <a> — Outlook/Gmail ignoram bordas arredondadas em <a> mas respeitam em
 * <td>. */
function ctaButton(label: string, url: string, color: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="border-radius:8px;background:${color};">
        <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function emailShell(
  tenant: TenantBranding,
  supabaseUrl: string,
  preheader: string,
  title: string,
  bodyHtml: string,
) {
  // email_logo_path (opcional) tem prioridade: é uma versão do logo com o
  // fundo já embutido nos pixels da própria imagem — enviada de propósito
  // pela tela de Identidade Visual pra escapar da reescrita de dark-mode de
  // clientes como o Gmail Android, que ignoram cor de fundo via CSS mas
  // nunca alteram o conteúdo de uma imagem. Sem essa imagem, cai pro
  // logo_light_path de sempre com o fundo configurável abaixo.
  const logoPath = tenant.email_logo_path || tenant.logo_light_path
  const logoUrl = logoPath ? `${supabaseUrl}/storage/v1/object/public/tenant-branding/${logoPath}` : null

  // Fundo do logo configurável (Identidade Visual → E-mails), separado do
  // fundo usado no app: um cliente de e-mail que não respeita os metas de
  // color-scheme abaixo pode escurecer o fundo branco do cabeçalho sem
  // recolorir a imagem do logo — se o PNG tiver conteúdo escuro pensado pra
  // um fundo claro, ele some. Padrão continua branco opaco (comportamento
  // de antes), mas o tenant pode ajustar.
  const logoBg = tenant.email_logo_background_transparent
    ? 'transparent'
    : tenant.email_logo_background_color || '#ffffff'

  const logoCell = logoUrl
    ? `<td style="background:${logoBg};border-radius:8px;" bgcolor="${logoBg === 'transparent' ? '#ffffff' : logoBg}" valign="middle">
         <img src="${logoUrl}" alt="${tenant.name}" height="36" style="display:block;height:36px;width:auto;" />
       </td>
       <td style="width:14px;font-size:0;line-height:0;">&nbsp;</td>`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef0f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08),0 1px 2px rgba(16,24,40,0.04);">
            <tr>
              <td style="background:${tenant.primary_color};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="background:${logoBg === 'transparent' ? '#ffffff' : logoBg};padding:28px 40px;border-bottom:1px solid #eef0f3;" bgcolor="${logoBg === 'transparent' ? '#ffffff' : logoBg}">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    ${logoCell}
                    <td valign="middle">
                      <span style="font-size:33px;font-weight:700;color:${tenant.primary_color};letter-spacing:-0.01em;">${tenant.name}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#18181b;">${title}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;background:#f8f9fb;border-top:1px solid #eef0f3;">
                <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#8b8f99;">
                  ${tenant.name} — este e-mail foi enviado automaticamente, não é preciso responder.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a5ad;">
                  Enviado via <strong style="color:#8b8f99;">PlaceHub</strong> — Conectando imóveis, corretores e oportunidades.
                </p>
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
    type?: 'welcome' | 'new_reservation' | 'commission_released' | 'payment_receipt' | 'test'
    user_id?: string
    reservation_id?: string
    installment_id?: string
    to?: string
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
      .select(
        'id, name, slug, primary_color, logo_light_path, email_logo_path, email_logo_background_color, email_logo_background_transparent',
      )
      .eq('id', tenantId)
      .single<TenantBranding>()

    if (!tenant) {
      return json({ sent: false, reason: 'tenant não encontrado' })
    }

    const fullName = (userData.user.user_metadata?.full_name as string | undefined) || null
    const html = emailShell(
      tenant,
      supabaseUrl,
      `Sua conta na ${tenant.name} foi criada. Acesse com seu e-mail e a senha combinada.`,
      `Bem-vindo(a) à ${tenant.name}!`,
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">Olá${fullName ? `, ${fullName}` : ''}!</p>
       <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#3f3f46;">Sua conta foi criada com sucesso. A partir de agora você pode acessar o sistema da ${tenant.name} pra acompanhar tudo que precisar por lá.</p>
       ${highlightBox('Seu e-mail de acesso', userData.user.email)}
       <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#3f3f46;">A senha de acesso foi combinada com quem criou seu cadastro. Clique no botão abaixo pra entrar:</p>
       ${ctaButton('Acessar minha conta', loginUrl(tenant.slug), tenant.primary_color)}`,
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
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.tenant_id) {
    return json({ error: 'sem tenant associado' }, 403)
  }

  // Disparado pela tela de Identidade Visual (E-mails), pra conferir a
  // aparência do cabeçalho/logo de verdade na caixa de entrada — usa a
  // identidade visual JÁ SALVA do tenant (é a mesma que os e-mails reais
  // usam), não um rascunho ainda não salvo.
  if (type === 'test') {
    if (callerProfile.role !== 'tenant_admin') {
      return json({ error: 'só o administrador da imobiliária pode enviar um e-mail de teste' }, 403)
    }
    if (!body.to) {
      return json({ error: 'to é obrigatório' }, 400)
    }

    const { data: tenant } = await adminClient
      .from('tenants')
      .select(
        'id, name, slug, primary_color, logo_light_path, email_logo_path, email_logo_background_color, email_logo_background_transparent',
      )
      .eq('id', callerProfile.tenant_id)
      .single<TenantBranding>()

    if (!tenant) return json({ sent: false, reason: 'tenant não encontrado' }, 404)

    const html = emailShell(
      tenant,
      supabaseUrl,
      'E-mail de teste da identidade visual do seu sistema.',
      'E-mail de teste',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">Olá!</p>
       <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#3f3f46;">Este é um e-mail de teste, gerado a partir da identidade visual salva agora pra ${tenant.name} — é assim que os e-mails de verdade (boas-vindas, reserva, comissão, recibo) vão aparecer.</p>
       ${highlightBox('Exemplo de destaque', 'R$ 1.234,56')}
       <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#3f3f46;">E os botões de ação aparecem assim:</p>
       ${ctaButton('Botão de exemplo', loginUrl(tenant.slug), tenant.primary_color)}`,
    )

    try {
      await sendViaResend(body.to, `E-mail de teste — ${tenant.name}`, html)
    } catch (err) {
      return json({ sent: false, reason: (err as Error).message }, 502)
    }
    return json({ sent: true })
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
      .select(
        'id, name, slug, primary_color, logo_light_path, email_logo_path, email_logo_background_color, email_logo_background_transparent',
      )
      .eq('id', reservation.tenant_id)
      .single<TenantBranding>()

    if (!tenant) return json({ sent: false, reason: 'tenant não encontrado' })

    const html = emailShell(
      tenant,
      supabaseUrl,
      `Reserva confirmada — confira os detalhes e o prazo de validade.`,
      'Reserva confirmada',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">Olá, ${reservation.customer_name}!</p>
       <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#3f3f46;">Sua reserva para <strong>${announcement?.title ?? 'o imóvel'}</strong> foi confirmada, feita em ${formatDate(reservation.reserved_at)}.</p>
       ${highlightBox('Válido até', formatDate(reservation.expires_at))}
       <p style="margin:0;font-size:15px;line-height:1.65;color:#3f3f46;">Em breve alguém da nossa equipe entra em contato pelos próximos passos.</p>`,
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
      .select(
        'id, name, slug, primary_color, logo_light_path, email_logo_path, email_logo_background_color, email_logo_background_transparent',
      )
      .eq('id', installment.tenant_id)
      .single<TenantBranding>()

    if (!tenant) return json({ sent: false, reason: 'tenant não encontrado' })

    const html = emailShell(
      tenant,
      supabaseUrl,
      'Uma parcela da sua comissão foi registrada como paga.',
      'Comissão liberada',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">Olá, ${broker.name}!</p>
       <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#3f3f46;">A parcela nº ${installment.number} da sua comissão foi registrada como paga${installment.broker_paid_at ? ` em ${formatDate(installment.broker_paid_at)}` : ''}.</p>
       ${highlightBox('Valor da parcela', formatPrice(installment.broker_amount))}
       <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#3f3f46;">Acesse o sistema pra confirmar o recebimento:</p>
       ${ctaButton('Confirmar recebimento', loginUrl(tenant.slug), tenant.primary_color)}`,
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
      .select(
        'id, name, slug, primary_color, logo_light_path, email_logo_path, email_logo_background_color, email_logo_background_transparent',
      )
      .eq('id', installment.tenant_id)
      .single<TenantBranding>()

    if (!tenant) return json({ sent: false, reason: 'tenant não encontrado' })

    const html = emailShell(
      tenant,
      supabaseUrl,
      'Recebemos o pagamento da parcela — confira o valor e a data.',
      'Recibo de pagamento',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">Olá, ${lead.name}!</p>
       <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#3f3f46;">Confirmamos o recebimento da parcela nº ${installment.number}${installment.payment_method ? ` (${installment.payment_method})` : ''}.</p>
       ${highlightBox('Valor recebido', formatPrice(installment.amount) + (installment.received_at ? ` — ${formatDate(installment.received_at)}` : ''))}
       <p style="margin:0;font-size:15px;line-height:1.65;color:#3f3f46;">Obrigado pela confiança!</p>`,
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
