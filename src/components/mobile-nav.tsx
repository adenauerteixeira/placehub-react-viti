import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu } from 'lucide-react'
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
  const location = useLocation()

  const activeGroups = new Set(
    entries
      .filter(
        (entry): entry is Extract<MobileNavEntry, { type: 'group' }> =>
          entry.type === 'group' &&
          entry.items.some((item) => location.pathname.startsWith(item.to)),
      )
      .map((entry) => entry.label),
  )
  const [openGroups, setOpenGroups] = useState(activeGroups)

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setOpenGroups(activeGroups)
      }}
    >
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
              <div key={`${entry.label}-${index}`} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.label)}
                  aria-expanded={openGroups.has(entry.label)}
                  className={cn(
                    'text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors',
                    activeGroups.has(entry.label) && 'text-foreground font-medium',
                  )}
                >
                  {entry.label}
                  <ChevronDown
                    className={cn(
                      'size-4 transition-transform',
                      openGroups.has(entry.label) && 'rotate-180',
                    )}
                  />
                </button>
                {openGroups.has(entry.label) && (
                  <div className="flex flex-col gap-1 border-l pl-2.5">
                    {entry.items.map((item) => (
                      <MobileNavLink key={item.to} to={item.to} onNavigate={() => setOpen(false)}>
                        {item.label}
                      </MobileNavLink>
                    ))}
                  </div>
                )}
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
