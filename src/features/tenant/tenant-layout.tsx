import { NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme-provider'
import { AppFooter, AppShell } from '@/components/app-shell'
import { MobileNav, type MobileNavEntry } from '@/components/mobile-nav'
import { NavGroup } from '@/components/nav-group'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import { hasPermission, type Profile } from '@/features/auth/use-profile'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import type { Tenant } from '@/features/tenants/api'

export type TenantOutletContext = { tenant: Tenant; profile: Profile }

const TENANT_PAGE_TITLES = [
  { path: '/leads', title: 'Leads', section: 'Comercial' },
  { path: '/reservations', title: 'Reservas', section: 'Comercial' },
  { path: '/negotiations', title: 'Negociações', section: 'Comercial' },
  { path: '/sales', title: 'Vendas', section: 'Comercial' },
  { path: '/commissions', title: 'Comissões', section: 'Comercial' },
  { path: '/reports', title: 'Relatórios', section: 'Comercial' },
  { path: '/developments', title: 'Empreendimentos', section: 'Administração' },
  { path: '/partners', title: 'Parceiros', section: 'Administração' },
  { path: '/brokers', title: 'Corretores', section: 'Administração' },
  { path: '/owners', title: 'Proprietários', section: 'Administração' },
  { path: '/users', title: 'Usuários', section: 'Administração' },
  { path: '/branding', title: 'Identidade visual', section: 'Administração' },
  { path: '/backup', title: 'Backup e restauração', section: 'Administração' },
  { path: '/resetar-dados', title: 'Resetar dados', section: 'Administração' },
  { path: '/changelog', title: 'Changelog', section: 'Administração' },
] as const

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
  const page = TENANT_PAGE_TITLES.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  )

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
    isAdmin && { to: '/backup', label: 'Backup e restauração' },
    isAdmin && { to: '/resetar-dados', label: 'Resetar dados' },
    isAdmin && { to: '/changelog', label: 'Changelog' },
  ].filter((item): item is { to: string; label: string } => !!item)

  const mobileEntries: MobileNavEntry[] = [
    { type: 'link', to: '/dashboard', label: 'Painel' },
    hasPermission(profile, 'announcements') && {
      type: 'link' as const,
      to: '/announcements',
      label: 'Anúncios',
    },
    commercialItems.length > 0 && { type: 'group' as const, label: 'Comercial', items: commercialItems },
    adminItems.length > 0 && { type: 'group' as const, label: 'Administração', items: adminItems },
    tenant.training_enabled && { type: 'link' as const, to: '/treinamento', label: 'Treinamento' },
  ].filter((entry): entry is MobileNavEntry => !!entry)

  return (
    <AppShell
      style={tenantThemeVars(tenant, resolvedTheme)}
      header={
        <>
          <div className="flex items-center gap-6">
            <MobileNav entries={mobileEntries} title={tenant.name} />
            <TenantBrand tenant={tenant} dark={dark} />
            <nav className="hidden items-center gap-4 text-sm md:flex">
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
              {tenant.training_enabled && (
                <TenantNavLink to="/treinamento">Treinamento</TenantNavLink>
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
          <span className="hidden sm:inline">
            © {new Date().getFullYear()} {tenant.name} — Conectando imóveis, corretores e
            oportunidades.
          </span>
          <span className="flex flex-col text-[11px] leading-tight sm:hidden">
            <span>
              © {new Date().getFullYear()} Place Hub — {tenant.name}
            </span>
            <span>Conectando imóveis, corretores e oportunidades.</span>
          </span>
        </AppFooter>
      }
    >
      <div className="flex min-w-0 flex-col gap-6">
        {page && (
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">{page.section}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{page.title}</h1>
          </div>
        )}
        <Outlet context={{ tenant, profile } satisfies TenantOutletContext} />
      </div>
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
