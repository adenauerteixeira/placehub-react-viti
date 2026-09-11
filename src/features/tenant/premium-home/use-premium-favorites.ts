import { useCallback, useState } from 'react'

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
  const [state, setState] = useState(() => ({
    tenantId,
    favorites: tenantId ? readFavorites(tenantId) : [],
  }))

  // Trocar de tenant precisa trocar também a lista em memória. Ajustar durante
  // a renderização evita uma tela intermediária com os favoritos do tenant anterior.
  if (state.tenantId !== tenantId) {
    setState({ tenantId, favorites: tenantId ? readFavorites(tenantId) : [] })
  }

  const favorites = state.favorites

  const toggle = useCallback(
    (announcementId: string) => {
      if (!tenantId) return
      setState((previous) => {
        const next = previous.favorites.includes(announcementId)
          ? previous.favorites.filter((id) => id !== announcementId)
          : [...previous.favorites, announcementId]
        try {
          localStorage.setItem(storageKey(tenantId), JSON.stringify(next))
        } catch {
          // ver comentário acima — falha em silêncio.
        }
        return { tenantId, favorites: next }
      })
    },
    [tenantId],
  )

  const isFavorite = useCallback((announcementId: string) => favorites.includes(announcementId), [favorites])

  return { favorites, isFavorite, toggle }
}
