import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { AppFooter, AppShell } from '@/components/app-shell'
import { MobileNav, type MobileNavEntry } from '@/components/mobile-nav'
import { NavGroup } from '@/components/nav-group'
import { PlatformPageLabel } from '@/components/platform-page-label'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import type { Profile } from '@/features/auth/use-profile'
import { useTheme } from '@/lib/theme-provider'
import { usePlatformLogoUrl } from '@/features/platform-branding/use-platform-brand-assets'

const PAGE_TITLES: Record<string, string> = {
  '/tenants': 'Tenants',
  '/branding': 'Identidade Visual',
  '/changelog': 'Changelog',
}

export function PlatformLayout({ profile }: { profile: Profile }) {
  const { user } = useAuth()
  const { resolvedTheme } = useTheme()
  const logoUrl = usePlatformLogoUrl(resolvedTheme === 'dark')
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname]

  const adminItems = [
    { to: '/branding', label: 'Identidade Visual' },
    { to: '/changelog', label: 'Changelog' },
  ]

  const mobileEntries: MobileNavEntry[] = [
    { type: 'link', to: '/tenants', label: 'Imobiliárias' },
    { type: 'group', label: 'Administração', items: adminItems },
  ]

  return (
    <AppShell
      header={
        <>
          <div className="flex items-center gap-6">
            <MobileNav entries={mobileEntries} title="PlaceHub" />
            <span className="flex items-center gap-2 font-semibold">
              {logoUrl && <img src={logoUrl} alt="PlaceHub" className="h-7 max-w-32 object-contain" />}
              PlaceHub <span className="text-muted-foreground font-normal">· Plataforma</span>
            </span>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <PlatformNavLink to="/tenants">Imobiliárias</PlatformNavLink>
              <NavGroup
                label="Administração"
                items={adminItems}
                active={adminItems.some((item) => location.pathname.startsWith(item.to))}
              />
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {pageTitle && <PlatformPageLabel page={pageTitle} />}
            <ThemeToggle />
            <UserMenu name={profile.full_name} email={user?.email} />
          </div>
        </>
      }
      footer={<AppFooter>PlaceHub — Administração da plataforma</AppFooter>}
    >
      <Outlet />
    </AppShell>
  )
}

function PlatformNavLink({ to, children }: { to: string; children: React.ReactNode }) {
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
