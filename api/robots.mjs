export function renderRobots(request) {
  const url = new URL(request.url, `https://${request.headers.host}`)
  const origin = `https://${url.host}`
  const body = `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /announcements\nDisallow: /leads\nDisallow: /negotiations\nDisallow: /proposals\nDisallow: /reservations\nDisallow: /sales\nDisallow: /commissions\nDisallow: /reports\nDisallow: /settings\nDisallow: /login\n\nSitemap: ${origin}/sitemap.xml\n`
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, s-maxage=3600' } })
}

export default { fetch: renderRobots }
