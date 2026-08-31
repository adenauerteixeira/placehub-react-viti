import { NavLink } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Grupo de links de navegação num dropdown — usado tanto no header do
 * tenant ("Comercial"/"Administração") quanto no da plataforma. */
export function NavGroup({
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
