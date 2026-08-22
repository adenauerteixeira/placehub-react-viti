import { NavLink, Outlet, useOutletContext } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import type { Profile } from '@/features/auth/use-profile'
import type { Tenant } from '@/features/tenants/api'

export type TenantOutletContext = { tenant: Tenant; profile: Profile }

export function useTenantOutletContext() {
  return useOutletContext<TenantOutletContext>()
}

export function TenantLayout({ tenant, profile }: { tenant: Tenant; profile: Profile }) {
  const { user } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">{tenant.name}</span>
          <nav className="flex items-center gap-4 text-sm">
            <TenantNavLink to="/dashboard">Painel</TenantNavLink>
            {profile.role === 'tenant_admin' && (
              <TenantNavLink to="/users">Usuários</TenantNavLink>
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
