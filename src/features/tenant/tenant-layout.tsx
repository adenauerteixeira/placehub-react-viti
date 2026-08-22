import type { CSSProperties } from 'react'
import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import type { Profile } from '@/features/auth/use-profile'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import type { Tenant } from '@/features/tenants/api'

export type TenantOutletContext = { tenant: Tenant; profile: Profile }

export function useTenantOutletContext() {
  return useOutletContext<TenantOutletContext>()
}

export function TenantLayout({ tenant, profile }: { tenant: Tenant; profile: Profile }) {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()

  const logoPath = resolvedTheme === 'dark' ? tenant.logo_dark_path : tenant.logo_light_path
  const logoUrl = brandingAssetUrl(logoPath, tenant.updated_at)

  // Marca do tenant sobrescreve só as variáveis de cor, escopada a esta
  // subárvore — não afeta o console da plataforma nem outros tenants.
  // Ver ARCHITECTURE.md — "Tema claro/escuro e identidade visual do tenant".
  const brandStyle = {
    '--primary': tenant.primary_color,
    '--ring': tenant.primary_color,
    '--accent': tenant.accent_color,
  } as CSSProperties

  return (
    <div className="flex min-h-svh flex-col" style={brandStyle}>
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          {logoUrl ? (
            <img src={logoUrl} alt={tenant.name} className="h-8 max-w-40 object-contain" />
          ) : (
            <span className="text-lg font-semibold">{tenant.name}</span>
          )}
          <nav className="flex items-center gap-4 text-sm">
            <TenantNavLink to="/dashboard">Painel</TenantNavLink>
            {profile.role === 'tenant_admin' && (
              <>
                <TenantNavLink to="/users">Usuários</TenantNavLink>
                <TenantNavLink to="/branding">Identidade visual</TenantNavLink>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu name={profile.full_name} email={user?.email} />
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet context={{ tenant, profile } satisfies TenantOutletContext} />
      </main>
    </div>
  )
}

function TenantNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'text-muted-foreground hover:text-foreground transition-colors',
          isActive && 'text-foreground font-medium',
        )
      }
    >
      {children}
    </NavLink>
  )
}
