import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme-provider'
import { AppFooter, AppShell, LogoBadge } from '@/components/app-shell'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import { hasPermission, type Profile } from '@/features/auth/use-profile'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import type { Tenant } from '@/features/tenants/api'

export type TenantOutletContext = { tenant: Tenant; profile: Profile }

export function useTenantOutletContext() {
  return useOutletContext<TenantOutletContext>()
}

export function TenantLayout({ tenant, profile }: { tenant: Tenant; profile: Profile }) {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  useTenantFavicon(tenant.favicon_path, tenant.updated_at)

  const logoPath = dark ? tenant.logo_dark_path : tenant.logo_light_path
  const logoUrl = brandingAssetUrl(logoPath, tenant.updated_at)
  const logoBackground = dark
    ? tenant.logo_dark_background_transparent
      ? 'transparent'
      : tenant.logo_dark_background_color
    : tenant.logo_light_background_transparent
      ? 'transparent'
      : tenant.logo_light_background_color

  return (
    <AppShell
      style={tenantThemeVars(tenant, resolvedTheme)}
      header={
        <>
          <div className="flex items-center gap-6">
            {logoUrl ? (
              <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />
            ) : (
              <span className="text-lg font-semibold">{tenant.name}</span>
            )}
            <nav className="flex items-center gap-4 text-sm">
              <TenantNavLink to="/dashboard">Painel</TenantNavLink>
              {hasPermission(profile, 'developments') && (
                <TenantNavLink to="/developments">Empreendimentos</TenantNavLink>
              )}
              {hasPermission(profile, 'partners') && (
                <TenantNavLink to="/partners">Parceiros</TenantNavLink>
              )}
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
        </>
      }
      footer={
        <AppFooter>
          © {new Date().getFullYear()} {tenant.name} — Conectando imóveis, corretores e
          oportunidades.
        </AppFooter>
      }
    >
      <Outlet context={{ tenant, profile } satisfies TenantOutletContext} />
    </AppShell>
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
