// Resolve o domínio raiz e o label de subdomínio a partir de window.location.
// Usado tanto pelo cookie de sessão (cookie-storage.ts) quanto pela
// resolução de tenant/plataforma por subdomínio. Ver ARCHITECTURE.md.
//
// Funciona igual em produção (placehub.app) e em dev (localhost), porque
// trata `localhost` como um domínio raiz de um único label (em vez do
// heurístico genérico "últimos dois labels", que quebraria para ele).

const LOCALHOST = 'localhost'

// Domínios raiz que a aplicação está apta a servir. O heurístico genérico
// abaixo ("últimos 2 labels") não dá conta dos dois casos reais em
// produção ao mesmo tempo: `placehubapp.com.br` (3 labels — raiz da
// plataforma, com wildcard de tenant) e `imb.br` (2 labels — domínio
// próprio da tenant Casah, `casah.imb.br`). Um domínio .com.br tem 3
// labels sem nenhum subdomínio de tenant, mas um domínio de 2 labels como
// `imb.br` TEM subdomínio de tenant — não dá pra distinguir os dois só
// pela contagem de labels. Uma Public Suffix List também não resolve:
// trata "*.br" inteiro como sufixo "de qualquer um" (herança de quando só
// dava pra registrar sob categorias tipo com.br), então classificaria
// `imb.br` como se fosse uma categoria e `casah.imb.br` como o domínio
// registrável — o oposto do que precisamos. Enquanto "domínio próprio por
// tenant" (ROADMAP.md) for configurado manualmente, esta lista é
// atualizada à mão a cada novo domínio custom adicionado.
const KNOWN_ROOT_DOMAINS = ['placehubapp.com.br', 'imb.br']

export function rootDomain(hostname: string = window.location.hostname): string | undefined {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return undefined // IP literal (ex: 127.0.0.1)
  if (hostname === LOCALHOST || hostname.endsWith(`.${LOCALHOST}`)) return LOCALHOST

  const known = KNOWN_ROOT_DOMAINS.find((root) => hostname === root || hostname.endsWith(`.${root}`))
  if (known) return known

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
