import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CreateButton } from '@/components/create-button'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { ErrorState } from '@/components/list-state'
import { Switch } from '@/components/ui/switch'
import { TableSkeleton } from '@/components/table-skeleton'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage } from '@/lib/errors'
import {
  useBackupSchedules,
  useDeleteBackupSchedule,
  useToggleBackupScheduleActive,
  type BackupSchedule,
} from './api'
import { AddScheduleDialog } from './add-schedule-dialog'
import { DAY_OF_WEEK_LABELS, formatTimeOfDay } from './labels'

export function BackupScheduleManager({ tenantId }: { tenantId: string }) {
  const { data: schedules, isLoading, isError, refetch } = useBackupSchedules(tenantId)
  const toggleActive = useToggleBackupScheduleActive(tenantId)
  const deleteSchedule = useDeleteBackupSchedule(tenantId)
  const { confirm } = useConfirm()

  const [createOpen, setCreateOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  function withPending(id: string, fn: () => Promise<void>) {
    setPendingIds((prev) => new Set(prev).add(id))
    return fn().finally(() =>
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      }),
    )
  }

  async function handleToggleActive(schedule: BackupSchedule, active: boolean) {
    try {
      await withPending(schedule.id, () => toggleActive.mutateAsync({ id: schedule.id, active }))
      toast.success(active ? 'Agendamento ativado.' : 'Agendamento desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', { description: errorMessage(error) })
    }
  }

  async function handleDelete(schedule: BackupSchedule) {
    const confirmed = await confirm({
      title: `Excluir o agendamento de ${DAY_OF_WEEK_LABELS[schedule.day_of_week]}?`,
      description: 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    })
    if (!confirmed) return

    try {
      await withPending(schedule.id, () => deleteSchedule.mutateAsync(schedule.id))
      toast.success('Agendamento excluído.')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: errorMessage(error) })
    }
  }

  const data = (schedules ?? []).map((s) => ({ ...s, _pending: pendingIds.has(s.id) }))

  const columns: DataTableColumn<(typeof data)[number]>[] = [
    {
      id: 'day_of_week',
      header: 'Dia da semana',
      accessorFn: (r) => DAY_OF_WEEK_LABELS[r.day_of_week],
    },
    {
      id: 'time_of_day',
      header: 'Horário',
      accessorFn: (r) => formatTimeOfDay(r.time_of_day),
    },
    {
      id: 'active',
      header: 'Ativo',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        return (
          <Switch
            checked={r.active}
            onCheckedChange={(checked) => handleToggleActive(r, checked)}
            disabled={r._pending}
            aria-label={r.active ? 'Desativar agendamento' : 'Ativar agendamento'}
          />
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir"
            disabled={row.original._pending}
            onClick={() => handleDelete(row.original)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {isLoading && <TableSkeleton columns={4} />}
      {isError && <ErrorState title="Não foi possível carregar os agendamentos." onRetry={() => refetch()} />}
      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={data}
          searchPlaceholder="Buscar..."
          toolbarEnd={<CreateButton label="Novo agendamento" size="icon-sm" onClick={() => setCreateOpen(true)} />}
        />
      )}

      <AddScheduleDialog open={createOpen} onOpenChange={setCreateOpen} tenantId={tenantId} />
    </div>
  )
}
