import { createContext, useContext } from 'react'

/** Nó DOM do `AppShell` mais próximo — é nele que `tenantThemeVars()` é
 * aplicado via `style` inline (ver ARCHITECTURE.md, "Tema claro/escuro e
 * identidade visual do tenant"). Todo componente shadcn que renderiza num
 * Radix Portal (Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip,
 * Select) usa este contexto como `container` do portal — sem isso, o Portal
 * cai no padrão do Radix (`document.body`), que fica FORA da árvore onde as
 * cores do tenant estão escopadas, e qualquer botão/conteúdo `primary`
 * dentro de um diálogo/menu volta a mostrar a cor padrão da plataforma em
 * vez da cor do tenant. */
const ThemeScopeContext = createContext<HTMLElement | null>(null)

export const ThemeScopeProvider = ThemeScopeContext.Provider

export function useThemeScope() {
  return useContext(ThemeScopeContext)
}
