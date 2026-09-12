import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppFooter, AppShell } from '@/components/app-shell'
import { MobileNav, type MobileNavEntry } from '@/components/mobile-nav'
import { NavGroup } from '@/components/nav-group'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import type { Profile } from '@/features/auth/use-profile'
import { useTheme } from '@/lib/theme-provider'
import { usePlatformLogoUrl } from '@/features/platform-branding/use-platform-brand-assets'

export function PlatformLayout({ profile }: { profile: Profile }) {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoUrl = usePlatformLogoUrl(resolvedTheme === 'dark')
  const location = useLocation()
  const isSecondaryPage = location.pathname !== '/tenants'
  const adminItems = [
    { to: '/branding', label: 'Identidade Visual' },
    { to: '/platform-users', label: 'Usuários da plataforma' },
    { to: '/changelog', label: 'Changelog' },
  ]

  const mobileEntries: MobileNavEntry[] = [
    { type: 'link', to: '/tenants', label: 'Imobiliárias' },
    { type: 'group', label: 'Configurações', items: adminItems },
  ]

  return (
    <AppShell
      header={
        <>
          <div className="flex items-center gap-5">
            <MobileNav entries={mobileEntries} title="PlaceHub" />
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt="PlaceHub" className="h-7 max-w-32 object-contain" />
              ) : (
                <span className="font-semibold">PlaceHub</span>
              )}
              <span className="text-muted-foreground border-l pl-2.5 text-sm">Console</span>
            </div>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <PlatformNavLink to="/tenants">Imobiliárias</PlatformNavLink>
              <NavGroup
                label="Configurações"
                items={adminItems}
                active={adminItems.some((item) => location.pathname.startsWith(item.to))}
                activeClassName="bg-accent text-accent-foreground rounded-md font-medium"
              />
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu name={profile.full_name} email={user?.email} />
          </div>
        </>
      }
      footer={<AppFooter>PlaceHub</AppFooter>}
    >
      <div className="flex flex-col gap-4">
        {isSecondaryPage && (
          <NavLink
            to="/tenants"
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar para Imobiliárias
          </NavLink>
        )}
        <Outlet />
      </div>
    </AppShell>
  )
}

function PlatformNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 transition-colors',
          isActive && 'bg-accent text-accent-foreground font-medium',
        )
      }
    >
      {children}
    </NavLink>
  )
}
