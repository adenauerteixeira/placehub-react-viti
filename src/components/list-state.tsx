import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Estado vazio padrão pra listagens (Card > Table) — ícone, título, descrição
 * e uma ação opcional (ex.: botão "Novo X"). */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5 py-10 text-center', className)}>
      <Icon className="text-muted-foreground/50 mb-1 size-8" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action}
    </div>
  )
}

/** Estado de erro padrão pra listagens — sempre com ação de "tentar
 * novamente" quando `onRetry` é passado (normalmente `refetch` do TanStack
 * Query), pra não deixar o usuário travado sem opção além de recarregar a
 * página inteira. */
export function ErrorState({
  title = 'Não foi possível carregar os dados.',
  description,
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5 py-10 text-center', className)}>
      <AlertCircle className="text-destructive/70 mb-1 size-8" />
      <p className="text-destructive text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1.5">
          <RefreshCw className="size-3.5" /> Tentar novamente
        </Button>
      )}
    </div>
  )
}
