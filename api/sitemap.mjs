import { escapeHtml } from './public-seo.mjs'

const PLATFORM_ROOT_DOMAIN = 'placehubapp.com.br'

function origin(request) {
  const url = new URL(request.url, `https://${request.headers.host}`)
  return `https://${url.host}`
}

async function getTenant(request) {
  const hostname = new URL(request.url, `https://${request.headers.host}`).hostname.toLowerCase()
  const slug = hostname.endsWith(`.${PLATFORM_ROOT_DOMAIN}`) ? hostname.split('.')[0] : null
  const filter = slug ? `slug=eq.${encodeURIComponent(slug)}` : `custom_domain=eq.${encodeURIComponent(hostname)}`
  const url = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase não configurado.')
  const headers = { apikey: key, Authorization: `Bearer ${key}` }
  const tenantResponse = await fetch(`${url}/rest/v1/tenants?select=id&active=eq.true&${filter}&limit=1`, { headers })
  if (!tenantResponse.ok) throw new Error('Tenant não encontrado.')
  const [tenant] = await tenantResponse.json()
  if (!tenant) return null
  const [announcementsResponse, brokersResponse] = await Promise.all([
    fetch(`${url}/rest/v1/announcements?select=slug,updated_at&tenant_id=eq.${encodeURIComponent(tenant.id)}&status=eq.published&order=updated_at.desc&limit=1000`, { headers }),
    fetch(`${url}/rest/v1/brokers?select=slug,updated_at&tenant_id=eq.${encodeURIComponent(tenant.id)}&active=eq.true&order=updated_at.desc&limit=1000`, { headers }),
  ])
  if (!announcementsResponse.ok || !brokersResponse.ok) throw new Error('Não foi possível montar o sitemap.')
  return { announcements: await announcementsResponse.json(), brokers: await brokersResponse.json() }
}

export async function renderSitemap(request) {
  try {
    const tenant = await getTenant(request)
    if (!tenant) return new Response('Not found', { status: 404 })
    const base = origin(request)
    const urls = [
      { loc: `${base}/`, lastmod: null },
      ...tenant.announcements.map((item) => ({ loc: `${base}/anuncios/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at })),
      { loc: `${base}/corretores`, lastmod: null },
      ...tenant.brokers.map((item) => ({ loc: `${base}/corretores/${encodeURIComponent(item.slug)}`, lastmod: item.updated_at })),
    ]
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((item) => `<url><loc>${escapeHtml(item.loc)}</loc>${item.lastmod ? `<lastmod>${new Date(item.lastmod).toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' } })
  } catch (error) {
    console.error('sitemap:', error)
    return new Response('Erro ao gerar sitemap.', { status: 500 })
  }
}

export default { fetch: renderSitemap }
