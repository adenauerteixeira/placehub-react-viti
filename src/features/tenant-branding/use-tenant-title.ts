import { useEffect } from 'react'

/** Aplica "{nome do tenant} | Place Hub" no título da aba do navegador —
 * mesmo padrão de restauração do useTenantFavicon (guarda o título anterior
 * e devolve no cleanup, pra não vazar o nome de um tenant pra outra rota). */
export function useTenantTitle(name: string | null) {
  useEffect(() => {
    if (!name) return
    const previous = document.title
    document.title = `${name} | Place Hub`
    return () => {
      document.title = previous
    }
  }, [name])
}
