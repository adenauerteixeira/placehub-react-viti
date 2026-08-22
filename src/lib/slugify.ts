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
