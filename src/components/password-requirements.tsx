import { Check, X } from 'lucide-react'
import { PASSWORD_RULES } from '@/lib/password'
import { cn } from '@/lib/utils'

/** Checklist de regras de senha, marcando ao vivo o que já foi atendido. */
export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value)
        return (
          <li
            key={rule.key}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors',
              met ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {met ? (
              <Check className="text-primary size-3.5 shrink-0" />
            ) : (
              <X className="size-3.5 shrink-0 opacity-40" />
            )}
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
