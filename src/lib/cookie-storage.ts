// Storage adapter que guarda a sessão do Supabase Auth em cookie no domínio
// raiz, para que o login feito em qualquer subdomínio (app.placehub.app,
// {tenant}.placehub.app) seja reconhecido pelos demais. Ver ARCHITECTURE.md.
//
// Nota sobre dev local: o Chrome trata `localhost` como um "public suffix"
// (mesma proteção anti-supercookie aplicada a TLDs reais) — um documento em
// `app.localhost` tentando setar `Domain=.localhost` tem o cookie
// silenciosamente REJEITADO (nem host-only fica). Isso não acontece em
// produção, com um domínio registrado de verdade (`placehub.app`), onde o
// compartilhamento entre subdomínios funciona normalmente. Por isso, em
// `localhost`, caímos para cookie host-only (sem `Domain=`) — login local
// funciona por subdomínio, só o SSO entre subdomínios não é testável via
// `*.localhost` puro (precisaria de um domínio de dois labels via hosts
// file, ex. `*.placehub.test`) — ver CONTINUITY.md.

import { rootDomain } from './hostname'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dias

function cookieDomain(): string | undefined {
  const root = rootDomain()
  return root && root !== 'localhost' ? `.${root}` : undefined
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

function writeCookie(name: string, value: string): void {
  const domain = cookieDomain()
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
  const domain = cookieDomain()
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
