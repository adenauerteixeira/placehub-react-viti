import { useEffect } from 'react'
import { platformBrandingAssetUrl } from './api'

const DEFAULT_HREF = '/favicon.svg'
const DEFAULT_TYPE = 'image/svg+xml'

const MIME_BY_EXT: Record<string, string> = {
  ico: 'image/x-icon',
  png: 'image/png',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/** Aplica o favicon da plataforma na aba do navegador (link#favicon, index.html). */
export function usePlatformFavicon(faviconPath: string | null, updatedAt: string) {
  useEffect(() => {
    // updatedAt vazio = configurações ainda carregando — index.html já tem o
    // favicon padrão, não precisa reatribuir (evita um 2º fetch redundante
    // do mesmo /favicon.svg assim que a query resolve, que o browser aborta).
    if (!updatedAt) return

    const link = document.querySelector<HTMLLinkElement>('link#favicon')
    if (!link) return

    const url = platformBrandingAssetUrl(faviconPath, updatedAt)
    if (!url || !faviconPath) {
      link.href = DEFAULT_HREF
      link.type = DEFAULT_TYPE
      return
    }

    const ext = faviconPath.split('.').pop()?.toLowerCase() ?? ''
    link.type = MIME_BY_EXT[ext] ?? 'image/x-icon'
    link.href = url

    return () => {
      link.href = DEFAULT_HREF
      link.type = DEFAULT_TYPE
    }
  }, [faviconPath, updatedAt])
}
