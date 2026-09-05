import { useCallback, useEffect, useState } from 'react'

function storageKey(tenantId: string) {
  return `premium-favorites:${tenantId}`
}

function readFavorites(tenantId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(tenantId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

/** Favoritos do visitante — salvos só no navegador dele (localStorage,
 * sem login), isolados por tenant. Se o storage estiver bloqueado (modo
 * privado, config do navegador), o favorito simplesmente não persiste entre
 * visitas, sem quebrar a página. */
export function usePremiumFavorites(tenantId: string | undefined) {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    if (!tenantId) return
    setFavorites(readFavorites(tenantId))
  }, [tenantId])

  const toggle = useCallback(
    (announcementId: string) => {
      if (!tenantId) return
      setFavorites((prev) => {
        const next = prev.includes(announcementId)
          ? prev.filter((id) => id !== announcementId)
          : [...prev, announcementId]
        try {
          localStorage.setItem(storageKey(tenantId), JSON.stringify(next))
        } catch {
          // ver comentário acima — falha em silêncio.
        }
        return next
      })
    },
    [tenantId],
  )

  const isFavorite = useCallback((announcementId: string) => favorites.includes(announcementId), [favorites])

  return { favorites, isFavorite, toggle }
}
