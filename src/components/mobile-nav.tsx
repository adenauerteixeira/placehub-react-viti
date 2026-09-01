import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export type MobileNavEntry =
  | { type: 'link'; to: string; label: string }
  | { type: 'group'; label: string; items: { to: string; label: string }[] }

/** Menu de navegação para telas estreitas — a barra horizontal do header
 * (TenantLayout/PlatformLayout) fica escondida em `md:hidden` e este botão
 * assume no lugar dela, abrindo os mesmos links num Sheet lateral. */
export function MobileNav({ entries, title }: { entries: MobileNavEntry[]; title: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu" className="md:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 overflow-y-auto px-4 pb-4">
          {entries.map((entry, index) =>
            entry.type === 'link' ? (
              <MobileNavLink key={entry.to} to={entry.to} onNavigate={() => setOpen(false)}>
                {entry.label}
              </MobileNavLink>
            ) : (
              <div key={`${entry.label}-${index}`} className="flex flex-col gap-1 pt-3 first:pt-0">
                <span className="text-muted-foreground px-2.5 text-xs font-medium tracking-wide uppercase">
                  {entry.label}
                </span>
                {entry.items.map((item) => (
                  <MobileNavLink key={item.to} to={item.to} onNavigate={() => setOpen(false)}>
                    {item.label}
                  </MobileNavLink>
                ))}
              </div>
            ),
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function MobileNavLink({
  to,
  children,
  onNavigate,
}: {
  to: string
  children: React.ReactNode
  onNavigate: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2.5 py-2 text-sm transition-colors',
          isActive && 'bg-accent text-accent-foreground font-medium',
        )
      }
    >
      {children}
    </NavLink>
  )
}
