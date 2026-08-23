const RESERVED_SLUGS = new Set(['app', 'www', 'api', 'admin', 'plataforma', 'auth', 'mail'])

export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$/

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/** Sufixo curto e aleatório pra desambiguar slugs gerados a partir de um
 * texto livre (título de anúncio, nome de empreendimento/corretor) — o
 * texto em si não é garantidamente único por tenant. */
export function randomSlugSuffix(length = 6): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)]
  }
  return out
}

/** slug a partir de um texto livre, já com sufixo aleatório anexado. */
export function slugWithRandomSuffix(input: string): string {
  const base = slugify(input) || 'item'
  return `${base}-${randomSlugSuffix()}`
}
