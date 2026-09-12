import { describe, expect, it } from 'vitest'
import { resolveSubdomainContext } from '../../src/lib/subdomain.js'

describe('resolveSubdomainContext', () => {
  it('keeps the platform wildcard routing for platform and tenant hosts', () => {
    expect(resolveSubdomainContext('app.placehubapp.com.br')).toEqual({ kind: 'platform' })
    expect(resolveSubdomainContext('casah.placehubapp.com.br')).toEqual({ kind: 'tenant', slug: 'casah' })
    expect(resolveSubdomainContext('app.localhost')).toEqual({ kind: 'platform' })
    expect(resolveSubdomainContext('casah.localhost')).toEqual({ kind: 'tenant', slug: 'casah' })
  })

  it('routes an external hostname through the database-backed custom-domain lookup', () => {
    expect(resolveSubdomainContext('Casah.Imb.Br')).toEqual({ kind: 'custom-domain', hostname: 'casah.imb.br' })
  })
})
