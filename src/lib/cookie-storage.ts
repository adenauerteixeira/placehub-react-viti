// Storage adapter que guarda a sessão do Supabase Auth em cookie no domínio
// raiz, para que o login feito em qualquer subdomínio (app.placehub.app,
// {tenant}.placehub.app) seja reconhecido pelos demais. Ver ARCHITECTURE.md.
//
// Em localhost (sem subdomínio real) cai para `document.cookie` sem
// `Domain=`, o que ainda funciona para desenvolvimento local.

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dias

function rootDomain(): string | undefined {
  const host = window.location.hostname
  if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return undefined
  }
  const parts = host.split('.')
  return parts.length <= 2 ? host : `.${parts.slice(-2).join('.')}`
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

function writeCookie(name: string, value: string): void {
  const domain = rootDomain()
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ]
  if (domain) parts.push(`Domain=${domain}`)
  if (window.location.protocol === 'https:') parts.push('Secure')
  document.cookie = parts.join('; ')
}

function removeCookie(name: string): void {
  const domain = rootDomain()
  const parts = [`${name}=`, 'Path=/', 'Max-Age=0']
  if (domain) parts.push(`Domain=${domain}`)
  document.cookie = parts.join('; ')
}

export const cookieStorage = {
  getItem: (key: string) => Promise.resolve(readCookie(key)),
  setItem: (key: string, value: string) => {
    writeCookie(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    removeCookie(key)
    return Promise.resolve()
  },
}
