import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { AppFooter, AppShell } from '@/components/app-shell'
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

  return (
    <AppShell
      header={
        <>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 font-semibold">
              {logoUrl && <img src={logoUrl} alt="PlaceHub" className="h-7 max-w-32 object-contain" />}
              PlaceHub <span className="text-muted-foreground font-normal">· Plataforma</span>
            </span>
            <nav className="flex items-center gap-4 text-sm">
              <PlatformNavLink to="/tenants">Imobiliárias</PlatformNavLink>
              <PlatformNavLink to="/branding">Identidade Visual</PlatformNavLink>
              <PlatformNavLink to="/changelog">Changelog</PlatformNavLink>
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
