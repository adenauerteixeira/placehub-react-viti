import { NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme-provider'
import { AppFooter, AppShell } from '@/components/app-shell'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import { hasPermission, type Profile } from '@/features/auth/use-profile'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import type { Tenant } from '@/features/tenants/api'

export type TenantOutletContext = { tenant: Tenant; profile: Profile }

export function useTenantOutletContext() {
  return useOutletContext<TenantOutletContext>()
}

export function TenantLayout({ tenant, profile }: { tenant: Tenant; profile: Profile }) {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const location = useLocation()

  useTenantFavicon(tenant.favicon_path, tenant.updated_at)
  useTenantTitle(tenant.name)

  const isAdmin = profile.role === 'tenant_admin'

  const commercialItems = [
    hasPermission(profile, 'leads') && { to: '/leads', label: 'Leads' },
    hasPermission(profile, 'reservations') && { to: '/reservations', label: 'Reservas' },
    hasPermission(profile, 'negotiations') && { to: '/negotiations', label: 'Negociações' },
    hasPermission(profile, 'sales') && { to: '/sales', label: 'Vendas' },
    hasPermission(profile, 'commissions') && { to: '/commissions', label: 'Comissões' },
    hasPermission(profile, 'reports') && { to: '/reports', label: 'Relatórios' },
  ].filter((item): item is { to: string; label: string } => !!item)

  const adminItems = [
    hasPermission(profile, 'developments') && { to: '/developments', label: 'Empreendimentos' },
    hasPermission(profile, 'partners') && { to: '/partners', label: 'Parceiros' },
    hasPermission(profile, 'brokers') && { to: '/brokers', label: 'Corretores' },
    hasPermission(profile, 'owners') && { to: '/owners', label: 'Proprietários' },
    isAdmin && { to: '/users', label: 'Usuários' },
    isAdmin && { to: '/branding', label: 'Identidade visual' },
    isAdmin && { to: '/changelog', label: 'Changelog' },
  ].filter((item): item is { to: string; label: string } => !!item)

  return (
    <AppShell
      style={tenantThemeVars(tenant, resolvedTheme)}
      header={
        <>
          <div className="flex items-center gap-6">
            <TenantBrand tenant={tenant} dark={dark} />
            <nav className="flex items-center gap-4 text-sm">
              <TenantNavLink to="/dashboard">Painel</TenantNavLink>
              {hasPermission(profile, 'announcements') && (
                <TenantNavLink to="/announcements">Anúncios</TenantNavLink>
              )}
              <NavGroup
                label="Comercial"
                items={commercialItems}
                active={commercialItems.some((item) => location.pathname.startsWith(item.to))}
              />
              <NavGroup
                label="Administração"
                items={adminItems}
                active={adminItems.some((item) => location.pathname.startsWith(item.to))}
              />
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

function NavGroup({
  label,
  items,
  active,
}: {
  label: string
  items: { to: string; label: string }[]
  active: boolean
}) {
  if (items.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors focus:outline-none',
            active && 'text-foreground font-medium',
          )}
        >
          {label}
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <NavLink
              to={item.to}
              className={({ isActive }) => cn(isActive && 'bg-accent text-accent-foreground')}
            >
              {item.label}
            </NavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
