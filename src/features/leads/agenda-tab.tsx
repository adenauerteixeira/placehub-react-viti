import { useMemo, useState } from 'react'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useAgendaFollowUps } from './api'
import { FollowUpTable } from './follow-up-table'

type Filter = 'open' | 'overdue' | 'completed' | 'all'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'Em aberto' },
  { key: 'overdue', label: 'Atrasados' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'all', label: 'Todos' },
]

export function AgendaTab() {
  const { tenant } = useTenantOutletContext()
  const { data: followUps, isLoading, isError } = useAgendaFollowUps(tenant.id)
  const [filter, setFilter] = useState<Filter>('open')

  const filtered = useMemo(() => {
    if (!followUps) return []
    const now = new Date()
    switch (filter) {
      case 'overdue':
        return followUps.filter((f) => !f.completed_at && new Date(f.scheduled_at) < now)
      case 'completed':
        return followUps.filter((f) => !!f.completed_at)
      case 'open':
        return followUps.filter((f) => !f.completed_at)
      default:
        return followUps
    }
  }, [followUps, filter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            onClick={() => setFilter(f.key)}
            className={cn('rounded-full')}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && <TableSkeleton columns={5} rows={4} search={false} />}
      {isError && <p className="text-destructive text-sm">Não foi possível carregar a agenda.</p>}
      {followUps && <FollowUpTable followUps={filtered} showLeadColumn />}
    </div>
  )
}
