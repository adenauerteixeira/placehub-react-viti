// Contexto de subdomínio (plataforma vs tenant) e construção de URLs entre
// subdomínios. Ver ARCHITECTURE.md — "Multi-tenancy / roteamento".

import { rootDomain, subdomainLabel } from './hostname'

const PLATFORM_LABEL = 'app'
const PLATFORM_ROOT_DOMAIN = 'placehubapp.com.br'

export type SubdomainContext =
  | { kind: 'platform' }
  | { kind: 'apex' }
  | { kind: 'tenant'; slug: string }
  | { kind: 'custom-domain'; hostname: string }

export function resolveSubdomainContext(
  hostname: string = window.location.hostname,
): SubdomainContext {
  // A confirmação de que o hostname pertence a um tenant vem da consulta
  // pública por `custom_domain`, não de uma lista hardcoded de domínios.
  if (hostname !== 'localhost' && hostname !== PLATFORM_ROOT_DOMAIN && !hostname.endsWith(`.${PLATFORM_ROOT_DOMAIN}`)) {
    return { kind: 'custom-domain', hostname: hostname.toLowerCase() }
  }
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
