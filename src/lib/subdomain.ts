// Contexto de subdomínio (plataforma vs tenant) e construção de URLs entre
// subdomínios. Ver ARCHITECTURE.md — "Multi-tenancy / roteamento".

import { rootDomain, subdomainLabel } from './hostname'

const PLATFORM_LABEL = 'app'

export type SubdomainContext =
  | { kind: 'platform' }
  | { kind: 'apex' }
  | { kind: 'tenant'; slug: string }

export function resolveSubdomainContext(
  hostname: string = window.location.hostname,
): SubdomainContext {
  const label = subdomainLabel(hostname)
  if (!label) return { kind: 'apex' }
  if (label === PLATFORM_LABEL) return { kind: 'platform' }
  return { kind: 'tenant', slug: label }
}

function urlFor(host: string, path: string): string {
  const { protocol, port } = window.location
  return `${protocol}//${host}${port ? `:${port}` : ''}${path}`
}

export function platformUrl(path = '/'): string {
  const root = rootDomain()
  return urlFor(root ? `${PLATFORM_LABEL}.${root}` : 'localhost', path)
}

export function tenantUrl(slug: string, path = '/dashboard'): string {
  const root = rootDomain()
  return urlFor(root ? `${slug}.${root}` : 'localhost', path)
}
