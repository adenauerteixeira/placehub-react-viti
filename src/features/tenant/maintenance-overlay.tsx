import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { useMaintenanceState } from './use-maintenance-state'

const DEFAULT_MESSAGE: Record<'backup' | 'restore', string> = {
  backup: 'Gerando um backup dos dados...',
  restore: 'Restaurando um backup...',
}

/** Trava a tela inteira do tenant (não só a página de backup) enquanto um
 * backup ou restauração — manual ou automático — está em andamento. Ver
 * tenant_maintenance_state / useMaintenanceState. */
export function MaintenanceOverlay({ tenantId }: { tenantId: string }) {
  const state = useMaintenanceState(tenantId)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state.active) return

    const root = document.getElementById('root')
    const previousAriaHidden = root?.getAttribute('aria-hidden')
    const previousOverflow = document.body.style.overflow
    root?.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    // Como não há ação disponível durante manutenção, não deixamos o Tab
    // escapar para controles que estão visualmente cobertos e marcados como
    // aria-hidden. O diálogo anuncia o estado sem prender o usuário num loop.
    const preventTabEscape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') event.preventDefault()
    }
    document.addEventListener('keydown', preventTabEscape)

    return () => {
      if (previousAriaHidden == null) root?.removeAttribute('aria-hidden')
      else root?.setAttribute('aria-hidden', previousAriaHidden)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', preventTabEscape)
    }
  }, [state.active])

  if (!state.active) return null

  const message = state.message ?? (state.reason ? DEFAULT_MESSAGE[state.reason] : null)

  return createPortal(
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-description"
      aria-live="assertive"
      tabIndex={-1}
      className="bg-background/95 fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-sm"
    >
      <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden="true" />
      <h1 id="maintenance-title" className="text-lg font-semibold">Sistema em manutenção</h1>
      <p id="maintenance-description" className="text-muted-foreground max-w-sm text-sm">
        {message ?? 'Uma tarefa de backup está em andamento.'} O sistema estará disponível em
        instantes.
      </p>
    </div>,
    document.body,
  )
}
