import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { TableSkeleton } from '@/components/table-skeleton'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useLeads } from '@/features/leads/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useNegotiations, type Negotiation } from './api'
import { NegotiationFormDialog } from './negotiation-form-dialog'
import { NEGOTIATION_STATUS_LABELS, NEGOTIATION_STATUS_VARIANT } from './labels'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function NegotiationsListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: negotiations, isLoading, isError, refetch } = useNegotiations(tenant.id)
  const { data: leads } = useLeads(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const [createOpen, setCreateOpen] = useState(false)

  const leadName = (id: string) => leads?.find((l) => l.id === id)?.name ?? '—'
  const announcementTitle = (id: string | null) => announcements?.find((a) => a.id === id)?.title ?? '—'
  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  const columns: DataTableColumn<Negotiation>[] = [
    {
      id: 'lead',
      accessorFn: (row) => leadName(row.lead_id),
      header: 'Lead',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    },
    {
      id: 'announcement',
      accessorFn: (row) => announcementTitle(row.announcement_id),
      header: 'Anúncio',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'broker',
      accessorFn: (row) => brokerName(row.broker_id),
      header: 'Corretor',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'status',
      accessorFn: (row) => NEGOTIATION_STATUS_LABELS[row.status],
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={NEGOTIATION_STATUS_VARIANT[row.original.status]}>
          {NEGOTIATION_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Criada em',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.created_at)}</span>
      ),
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
            aria-label="Ver detalhes"
            onClick={() => navigate(`/negotiations/${row.original.id}`)}
          >
            <Eye className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negociações</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Nova negociação</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <TableSkeleton columns={6} />}
        {isError && (
          <ErrorState title="Não foi possível carregar as negociações." onRetry={() => refetch()} />
        )}
        {negotiations && negotiations.length === 0 && (
          <EmptyState title="Nenhuma negociação cadastrada ainda." />
        )}
        {negotiations && negotiations.length > 0 && (
          <DataTable columns={columns} data={negotiations} searchPlaceholder="Buscar por lead, anúncio..." />
        )}
      </CardContent>

      <NegotiationFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  )
}
