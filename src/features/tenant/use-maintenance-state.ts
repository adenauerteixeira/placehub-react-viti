import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type MaintenanceState = {
  active: boolean
  reason: 'backup' | 'restore' | null
  message: string | null
}

const EMPTY_STATE: MaintenanceState = { active: false, reason: null, message: null }

function queryKey(tenantId: string) {
  return ['tenant-maintenance-state', tenantId]
}

/** Estado de manutenção do tenant (backup/restore em andamento) — carrega o
 * estado atual (cobre quem abre/recarrega a página no meio de uma operação)
 * e assina Postgres Changes pra atualizar ao vivo enquanto a aba fica
 * aberta. Ver tenant_maintenance_state, escrita pelas Edge Functions de
 * backup/restore. */
export function useMaintenanceState(tenantId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKey(tenantId),
    queryFn: async (): Promise<MaintenanceState> => {
      const { data, error } = await supabase
        .from('tenant_maintenance_state')
        .select('active, reason, message')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error) throw error
      return data ?? EMPTY_STATE
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel(`tenant-maintenance-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_maintenance_state',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as MaintenanceState | undefined
          queryClient.setQueryData(queryKey(tenantId), row ?? EMPTY_STATE)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])

  return query.data ?? EMPTY_STATE
}
