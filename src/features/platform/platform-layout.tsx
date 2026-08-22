import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/features/auth/user-menu'
import { useAuth } from '@/features/auth/auth-context'
import type { Profile } from '@/features/auth/use-profile'

export function PlatformLayout({ profile }: { profile: Profile }) {
  const { user } = useAuth()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold">PlaceHub</span>
          <span className="text-muted-foreground text-sm">Plataforma</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu name={profile.full_name} email={user?.email} />
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
