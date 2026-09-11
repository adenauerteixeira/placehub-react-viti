import { describe, expect, it } from 'vitest'
import { DEFAULT_PAGE_SIZE, searchableTerm } from '../../src/lib/pagination.js'

describe('pagination helpers', () => {
  it('uses the standard page size', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25)
  })

  it('trims ordinary search terms', () => {
    expect(searchableTerm('  apartamento centro  ')).toBe('apartamento centro')
  })

  it('removes PostgREST wildcard and expression characters', () => {
    expect(searchableTerm('apartamento_50%, (centro)')).toBe('apartamento50 centro')
  })
})
