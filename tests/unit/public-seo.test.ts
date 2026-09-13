import { afterEach, describe, expect, it, vi } from 'vitest'
import publicSeo, { escapeHtml, plainText } from '../../api/public-seo.mjs'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.VITE_SUPABASE_URL
  delete process.env.VITE_SUPABASE_ANON_KEY
})

describe('public SEO helpers', () => {
  it('escapes dynamic values before placing them in HTML', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)"> &')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp;')
  })

  it('normalizes and safely truncates meta descriptions', () => {
    expect(plainText('  Casa\n\n ampla   e iluminada  ')).toBe('Casa ampla e iluminada')
    expect(plainText('a'.repeat(160))).toHaveLength(155)
    expect(plainText('a'.repeat(160))).toMatch(/…$/)
  })

  it('generates indexable metadata and escaped content for a published announcement', async () => {
    process.env.VITE_SUPABASE_URL = 'https://project.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'public-key'
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/tenants?')) return Response.json([{ id: 'tenant-1', name: 'Casah', slug: 'casah' }])
      if (url.includes('/announcements?')) {
        return Response.json([{
          id: 'announcement-1', title: 'Casa <ampla>', subtitle: null, slug: 'casa-ampla',
          description: 'Uma casa segura & iluminada.', price: 500000, promotional_price: null,
          neighborhood: 'Centro', city: 'Goiânia', state: 'GO',
        }])
      }
      if (url.includes('/announcement_images?')) return Response.json([{ path: 'tenant-1/capa.jpg', caption: null, is_cover: true }])
      throw new Error(`URL inesperada: ${url}`)
    }) as typeof fetch

    const result = await publicSeo.fetch(new Request('https://casah.placehubapp.com.br/api/public-seo?route=announcement&slug=casa-ampla'))
    const html = await result.text()

    expect(result.status).toBe(200)
    expect(html).toContain('<title>Casa &lt;ampla&gt; | Casah</title>')
    expect(html).toContain('<link rel="canonical" href="https://casah.placehubapp.com.br/anuncios/casa-ampla">')
    expect(html).toContain('application/ld+json')
    expect(html).toContain('Casa &lt;ampla&gt;')
    expect(html).not.toContain('<h1>Casa <ampla>')
  })
})
