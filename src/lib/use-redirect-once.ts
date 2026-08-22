import { useEffect, useRef } from 'react'

// Navega para `url` uma única vez, mesmo sob o double-invoke de efeitos do
// StrictMode em dev (sem o guard, duas chamadas de `location.replace` em
// sequência cancelam uma à outra — a navegação nunca completa).
export function useRedirectOnce(url: string | null): void {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!url || firedRef.current) return
    firedRef.current = true
    window.location.replace(url)
  }, [url])
}
