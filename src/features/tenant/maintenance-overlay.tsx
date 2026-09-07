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

  if (!state.active) return null

  const message = state.message ?? (state.reason ? DEFAULT_MESSAGE[state.reason] : null)

  return (
    <div className="bg-background/95 fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-sm">
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
      <h1 className="text-lg font-semibold">Sistema em manutenção</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        {message ?? 'Uma tarefa de backup está em andamento.'} O sistema estará disponível em
        instantes.
      </p>
    </div>
  )
}
