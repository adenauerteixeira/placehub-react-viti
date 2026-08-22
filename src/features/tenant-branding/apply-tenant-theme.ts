import type { CSSProperties } from 'react'
import { contrastForeground } from '@/lib/color-contrast'
import type { Tenant } from '@/features/tenants/api'

// Sobrescreve os tokens de tema do shadcn com a identidade visual completa
// do tenant (claro e escuro), escopado via `style` numa subárvore — não
// afeta o console da plataforma nem outros tenants. `--destructive` fica de
// fora de propósito (estado de erro deve ser reconhecível igual em
// qualquer marca). Ver ARCHITECTURE.md.
export function tenantThemeVars(tenant: Tenant, resolvedTheme: 'light' | 'dark'): CSSProperties {
  if (resolvedTheme === 'dark') {
    return {
      '--background': tenant.dark_background_color,
      '--foreground': tenant.dark_text_color,
      '--card': tenant.dark_surface_color,
      '--card-foreground': tenant.dark_text_color,
      '--popover': tenant.dark_surface_color,
      '--popover-foreground': tenant.dark_text_color,
      '--primary': tenant.dark_primary_color,
      '--primary-foreground': contrastForeground(tenant.dark_primary_color),
      '--secondary': tenant.dark_surface_color,
      '--secondary-foreground': tenant.dark_text_color,
      '--muted': tenant.dark_surface_color,
      '--muted-foreground': tenant.dark_muted_text_color,
      '--accent': tenant.dark_accent_color,
      '--accent-foreground': contrastForeground(tenant.dark_accent_color),
      '--border': tenant.dark_border_color,
      '--input': tenant.dark_border_color,
      '--ring': tenant.dark_primary_color,
    } as CSSProperties
  }

  return {
    '--background': tenant.light_background_color,
    '--foreground': tenant.light_text_color,
    '--card': tenant.light_surface_color,
    '--card-foreground': tenant.light_text_color,
    '--popover': tenant.light_surface_color,
    '--popover-foreground': tenant.light_text_color,
    '--primary': tenant.primary_color,
    '--primary-foreground': contrastForeground(tenant.primary_color),
    '--secondary': tenant.secondary_color,
    '--secondary-foreground': contrastForeground(tenant.secondary_color),
    '--muted': tenant.light_surface_color,
    '--muted-foreground': tenant.light_muted_text_color,
    '--accent': tenant.accent_color,
    '--accent-foreground': contrastForeground(tenant.accent_color),
    '--border': tenant.light_border_color,
    '--input': tenant.light_border_color,
    '--ring': tenant.primary_color,
  } as CSSProperties
}
