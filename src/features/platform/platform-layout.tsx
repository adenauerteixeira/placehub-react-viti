import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { AppFooter, AppShell } from '@/components/app-shell'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import type { Profile } from '@/features/auth/use-profile'

export function PlatformLayout({ profile }: { profile: Profile }) {
  const { user } = useAuth()

  return (
    <AppShell
      header={
        <>
          <div className="flex items-center gap-6">
            <span className="font-semibold">
              PlaceHub <span className="text-muted-foreground font-normal">· Plataforma</span>
            </span>
            <nav className="flex items-center gap-4 text-sm">
              <PlatformNavLink to="/tenants">Imobiliárias</PlatformNavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
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
