const PLATFORM_ROOT_DOMAIN = 'placehubapp.com.br'
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function plainText(value, limit = 155) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function jsonForHtml(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function requestUrl(request) {
  const host = request.headers.host ?? 'localhost'
  return new URL(request.url, `https://${host}`)
}

function publicOrigin(request) {
  const url = requestUrl(request)
  const forwardedProtocol = request.headers['x-forwarded-proto']
  const protocol = forwardedProtocol === 'http' ? 'http:' : 'https:'
  return `${protocol}//${url.host}`
}

function tenantSlugFromHost(hostname) {
  const host = hostname.toLowerCase().split(':')[0]
  if (host === PLATFORM_ROOT_DOMAIN || host === `app.${PLATFORM_ROOT_DOMAIN}`) return null
  if (host.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) return host.slice(0, -(`.${PLATFORM_ROOT_DOMAIN}`).length).split('.')[0]
  return null
}

function supabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase não configurado no ambiente da função SEO.')
  return { url: url.replace(/\/$/, ''), key }
}

async function select(table, params) {
  const { url, key } = supabaseConfig()
  const response = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!response.ok) throw new Error(`Falha ao consultar ${table}: ${response.status}`)
  return response.json()
}

async function findTenant(request) {
  const hostname = requestUrl(request).hostname.toLowerCase()
  const slug = tenantSlugFromHost(hostname)
  const filter = slug ? `slug=eq.${encodeURIComponent(slug)}` : `custom_domain=eq.${encodeURIComponent(hostname)}`
  const rows = await select('tenants', `select=id,name,slug,custom_domain,updated_at,active&active=eq.true&${filter}&limit=1`)
  return rows[0] ?? null
}

function response(body, status = 200, contentType = 'text/html; charset=utf-8') {
  return new Response(body, {
    status,
    headers: { 'content-type': contentType, 'cache-control': CACHE_CONTROL, 'x-robots-tag': 'index, follow' },
  })
}

function notFound() {
  return response('<!doctype html><title>Página não encontrada</title><h1>Página não encontrada</h1>', 404)
}

function imageUrl(path) {
  if (!path) return null
  const { url } = supabaseConfig()
  return `${url}/storage/v1/object/public/catalog-media/${path.split('/').map(encodeURIComponent).join('/')}`
}

function page({ title, description, canonical, image, schema, body }) {
  const ogImage = image
    ? `<meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image">`
    : '<meta name="twitter:card" content="summary">'
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}">${ogImage}
<script type="application/ld+json">${jsonForHtml(schema)}</script></head><body>${body}</body></html>`
}

function announcementPage(tenant, announcement, images, origin) {
  const canonical = `${origin}/anuncios/${encodeURIComponent(announcement.slug)}`
  const image = imageUrl(images.find((item) => item.is_cover)?.path ?? images[0]?.path)
  const location = [announcement.neighborhood, announcement.city, announcement.state].filter(Boolean).join(', ')
  const description = plainText(announcement.description || announcement.subtitle || `${announcement.title}${location ? ` em ${location}` : ''}`, 155)
  const price = announcement.promotional_price ?? announcement.price
  const schema = {
    '@context': 'https://schema.org', '@type': 'Product', name: announcement.title, description, url: canonical,
    image: image ? [image] : undefined,
    offers: { '@type': 'Offer', priceCurrency: 'BRL', price, availability: 'https://schema.org/InStock', url: canonical },
    ...(location ? { areaServed: location } : {}),
  }
  const photoMarkup = images.slice(0, 12).map((item) => {
    const src = imageUrl(item.path)
    return src ? `<li><img src="${escapeHtml(src)}" alt="${escapeHtml(item.caption || announcement.title)}"></li>` : ''
  }).join('')
  return page({
    title: `${announcement.title} | ${tenant.name}`,
    description,
    canonical,
    image,
    schema,
    body: `<main><nav><a href="/">${escapeHtml(tenant.name)}</a> / <a href="/anuncios/${encodeURIComponent(announcement.slug)}">Anúncio</a></nav><article><h1>${escapeHtml(announcement.title)}</h1>${announcement.subtitle ? `<p>${escapeHtml(announcement.subtitle)}</p>` : ''}${location ? `<p>${escapeHtml(location)}</p>` : ''}<p>${escapeHtml(Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}</p>${announcement.description ? `<section><h2>Descrição</h2><p>${escapeHtml(announcement.description)}</p></section>` : ''}${photoMarkup ? `<section><h2>Fotos do imóvel</h2><ul>${photoMarkup}</ul></section>` : ''}</article></main>`,
  })
}

function brokerPage(tenant, broker, origin) {
  const canonical = `${origin}/corretores/${encodeURIComponent(broker.slug)}`
  const description = plainText(broker.bio || `Conheça ${broker.name}, corretor da ${tenant.name}.`)
  const schema = { '@context': 'https://schema.org', '@type': 'Person', name: broker.name, description, url: canonical }
  return page({ title: `${broker.name} | ${tenant.name}`, description, canonical, schema, body: `<main><nav><a href="/">${escapeHtml(tenant.name)}</a> / <a href="/corretores">Corretores</a></nav><article><h1>${escapeHtml(broker.name)}</h1>${broker.creci ? `<p>CRECI ${escapeHtml(broker.creci)}${broker.creci_state ? `/${escapeHtml(broker.creci_state)}` : ''}</p>` : ''}${broker.bio ? `<p>${escapeHtml(broker.bio)}</p>` : ''}</article></main>` })
}

function homePage(tenant, announcements, origin) {
  const canonical = `${origin}/`
  const description = `Imóveis anunciados pela ${tenant.name}. Encontre casas, apartamentos, terrenos e outros imóveis.`
  const links = announcements.map((item) => `<li><a href="/anuncios/${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a>${item.city ? ` — ${escapeHtml(item.city)}` : ''}</li>`).join('')
  return page({ title: tenant.name, description, canonical, schema: { '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: tenant.name, url: canonical }, body: `<main><h1>${escapeHtml(tenant.name)}</h1><p>${escapeHtml(description)}</p><section><h2>Imóveis disponíveis</h2><ul>${links}</ul></section><p><a href="/corretores">Conheça nossos corretores</a></p></main>` })
}

function brokersPage(tenant, brokers, origin) {
  const canonical = `${origin}/corretores`
  const description = `Conheça os corretores da ${tenant.name} e encontre o atendimento ideal para seu imóvel.`
  const links = brokers.map((item) => `<li><a href="/corretores/${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a>${item.creci ? ` — CRECI ${escapeHtml(item.creci)}${item.creci_state ? `/${escapeHtml(item.creci_state)}` : ''}` : ''}</li>`).join('')
  return page({ title: `Corretores | ${tenant.name}`, description, canonical, schema: { '@context': 'https://schema.org', '@type': 'RealEstateAgent', name: tenant.name, url: canonical }, body: `<main><nav><a href="/">${escapeHtml(tenant.name)}</a></nav><h1>Corretores da ${escapeHtml(tenant.name)}</h1><p>${escapeHtml(description)}</p><ul>${links}</ul></main>` })
}

export async function renderPublicSeo(request) {
  try {
    const url = requestUrl(request)
    const route = url.searchParams.get('route')
    const tenant = await findTenant(request)
    if (!tenant) return notFound()
    const origin = publicOrigin(request)

    if (route === 'announcement') {
      const slug = url.searchParams.get('slug')
      if (!slug) return notFound()
      const rows = await select('announcements', `select=id,title,subtitle,slug,description,price,promotional_price,neighborhood,city,state&tenant_id=eq.${encodeURIComponent(tenant.id)}&status=eq.published&slug=eq.${encodeURIComponent(slug)}&limit=1`)
      const announcement = rows[0]
      if (!announcement) return notFound()
      const images = await select('announcement_images', `select=path,caption,is_cover,sort_order&announcement_id=eq.${encodeURIComponent(announcement.id)}&order=sort_order.asc`)
      return response(announcementPage(tenant, announcement, images, origin))
    }

    if (route === 'broker') {
      const slug = url.searchParams.get('slug')
      if (!slug) return notFound()
      const rows = await select('brokers', `select=name,slug,bio,creci,creci_state&tenant_id=eq.${encodeURIComponent(tenant.id)}&active=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`)
      return rows[0] ? response(brokerPage(tenant, rows[0], origin)) : notFound()
    }

    if (route === 'brokers') {
      const brokers = await select('brokers', `select=name,slug,creci,creci_state&tenant_id=eq.${encodeURIComponent(tenant.id)}&active=eq.true&order=name.asc&limit=1000`)
      return response(brokersPage(tenant, brokers, origin))
    }

    const announcements = await select('announcements', `select=title,slug,city&tenant_id=eq.${encodeURIComponent(tenant.id)}&status=eq.published&order=published_at.desc&limit=1000`)
    return response(homePage(tenant, announcements, origin))
  } catch (error) {
    console.error('public-seo:', error)
    return new Response('Erro ao gerar a página pública.', { status: 500, headers: { 'x-robots-tag': 'noindex' } })
  }
}

export default { fetch: renderPublicSeo }
