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
  const common = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ]
  if (window.location.protocol === 'https:') common.push('Secure')

  if (domain) {
    document.cookie = [...common, `Domain=${domain}`].join('; ')
    // Alguns domínios raiz de 2 labels (ex: certos .br) ainda são tratados
    // pelo navegador como "public suffix" — mesmo caso do `.localhost` já
    // documentado acima, só que sem dar pra prever antecipadamente quais
    // (a lista pública trata todo *.br como sufixo, o que erra pro lado
    // oposto do nosso roteamento — ver hostname.ts). O navegador REJEITA
    // silenciosamente um `Domain=` assim: confirma se colou e, se não,
    // cai pra cookie host-only (funciona pro próprio domínio, só não daria
    // SSO entre subdomínios dele — não é o caso de domínio próprio de
    // tenant, que não tem outros subdomínios mesmo).
    if (readCookie(name) === value) return
  }
  document.cookie = common.join('; ')
}

function removeCookie(name: string): void {
  const domain = cookieDomain()
  const base = [`${name}=`, 'Path=/', 'Max-Age=0']
  // Remove as duas variantes possíveis (host-only e Domain=) sem saber qual
  // delas ficou de pé de fato — a que não existir é um no-op inofensivo.
  document.cookie = base.join('; ')
  if (domain) document.cookie = [...base, `Domain=${domain}`].join('; ')
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
