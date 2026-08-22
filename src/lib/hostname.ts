// Resolve o domínio raiz e o label de subdomínio a partir de window.location.
// Usado tanto pelo cookie de sessão (cookie-storage.ts) quanto pela
// resolução de tenant/plataforma por subdomínio. Ver ARCHITECTURE.md.
//
// Funciona igual em produção (placehub.app) e em dev (localhost), porque
// trata `localhost` como um domínio raiz de um único label (em vez do
// heurístico genérico "últimos dois labels", que quebraria para ele).

const LOCALHOST = 'localhost'

export function rootDomain(hostname: string = window.location.hostname): string | undefined {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return undefined // IP literal (ex: 127.0.0.1)
  if (hostname === LOCALHOST || hostname.endsWith(`.${LOCALHOST}`)) return LOCALHOST

  const parts = hostname.split('.')
  return parts.length <= 2 ? hostname : parts.slice(-2).join('.')
}

/** Label de subdomínio (ex: 'casah' em 'casah.placehub.app'), ou null no domínio raiz/IP. */
export function subdomainLabel(hostname: string = window.location.hostname): string | null {
  const root = rootDomain(hostname)
  if (!root) return null

  const hostParts = hostname.split('.')
  const rootParts = root.split('.').length
  return hostParts.length > rootParts ? hostParts[0] : null
}
