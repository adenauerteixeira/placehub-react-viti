import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type BackupSchedule = {
  id: string
  tenant_id: string
  day_of_week: number // 0=domingo .. 6=sábado (extract(dow))
  time_of_day: string // "HH:mm:ss"
  active: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

const COLUMNS = 'id, tenant_id, day_of_week, time_of_day, active, last_run_at, created_at, updated_at'

export function useBackupSchedules(tenantId: string) {
  return useQuery({
    queryKey: ['backup-schedules', tenantId],
    queryFn: async (): Promise<BackupSchedule[]> => {
      const { data, error } = await supabase
        .from('tenant_backup_schedules')
        .select(COLUMNS)
        .eq('tenant_id', tenantId)
        .order('day_of_week')
        .order('time_of_day')

      if (error) throw error
      return data
    },
  })
}

export type BackupScheduleInput = {
  day_of_week: number
  time_of_day: string
}

export function useCreateBackupSchedule(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BackupScheduleInput): Promise<BackupSchedule> => {
      const { data, error } = await supabase
        .from('tenant_backup_schedules')
        .insert({ tenant_id: tenantId, ...input })
        .select(COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedules', tenantId] })
    },
  })
}

export function useToggleBackupScheduleActive(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<void> => {
      const { error } = await supabase.from('tenant_backup_schedules').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedules', tenantId] })
    },
  })
}

export function useDeleteBackupSchedule(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('tenant_backup_schedules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedules', tenantId] })
    },
  })
}
