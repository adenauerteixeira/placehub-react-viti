import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBrokers } from '@/features/brokers/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { AgendaTab } from './agenda-tab'
import { useLeads, type Lead } from './api'
import { LeadFormDialog } from './lead-form-dialog'
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_VARIANT } from './labels'

export function LeadsListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: leads, isLoading, isError, refetch } = useLeads(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const [createOpen, setCreateOpen] = useState(false)

  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  const columns: DataTableColumn<Lead>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'contact',
      accessorFn: (row) => row.phone || row.email || '—',
      header: 'Contato',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'source',
      accessorFn: (row) => LEAD_SOURCE_LABELS[row.source],
      header: 'Origem',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'status',
      accessorFn: (row) => LEAD_STATUS_LABELS[row.status],
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={LEAD_STATUS_VARIANT[row.original.status]}>
          {LEAD_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'broker',
      accessorFn: (row) => brokerName(row.broker_id),
      header: 'Corretor',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
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
            onClick={() => navigate(`/leads/${row.original.id}`)}
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
        <CardTitle>Leads</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Novo lead</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="pt-4">
            {isLoading && <Skeleton className="h-40 w-full" />}
            {isError && (
              <ErrorState title="Não foi possível carregar os leads." onRetry={() => refetch()} />
            )}
            {leads && leads.length === 0 && <EmptyState title="Nenhum lead cadastrado ainda." />}
            {leads && leads.length > 0 && (
              <DataTable columns={columns} data={leads} searchPlaceholder="Buscar por nome, contato..." />
            )}
          </TabsContent>

          <TabsContent value="agenda" className="pt-4">
            <AgendaTab />
          </TabsContent>
        </Tabs>
      </CardContent>

      <LeadFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  )
}
