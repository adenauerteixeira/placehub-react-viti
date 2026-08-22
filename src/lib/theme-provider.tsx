import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

const STORAGE_KEY = 'placehub-theme'

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system',
  )
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    theme === 'system' ? systemTheme() : theme,
  )

  useEffect(() => {
    const root = document.documentElement
    const applied = theme === 'system' ? systemTheme() : theme
    root.classList.toggle('dark', applied === 'dark')
    setResolvedTheme(applied)

    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = systemTheme()
      root.classList.toggle('dark', next === 'dark')
      setResolvedTheme(next)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next) => {
        localStorage.setItem(STORAGE_KEY, next)
        setTheme(next)
      },
    }),
    [theme, resolvedTheme],
  )

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
