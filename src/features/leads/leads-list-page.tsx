import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateButton } from '@/components/create-button'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { TableSkeleton } from '@/components/table-skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBrokers } from '@/features/brokers/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { AgendaTab } from './agenda-tab'
import { useLeadsPage, type Lead } from './api'
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination'
import { LeadFormDialog } from './lead-form-dialog'
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_VARIANT } from './labels'

export function LeadsListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const { data: leadsPage, isLoading, isError, refetch } = useLeadsPage(tenant.id, {
    page, pageSize: DEFAULT_PAGE_SIZE, search, sortBy: 'created_at', ascending: false,
  })
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
          <CreateButton label="Novo lead" onClick={() => setCreateOpen(true)} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="pt-4">
            {isLoading && <TableSkeleton columns={6} />}
            {isError && (
              <ErrorState title="Não foi possível carregar os leads." onRetry={() => refetch()} />
            )}
            {leadsPage?.total === 0 && <EmptyState title="Nenhum lead cadastrado ainda." />}
            {leadsPage && leadsPage.total > 0 && (
              <DataTable columns={columns} data={leadsPage.data} searchPlaceholder="Buscar por nome, contato..." remote={{ pageIndex: page, totalRows: leadsPage.total, search, onPageChange: setPage, onSearchChange: (value) => { setSearch(value); setPage(0) } }} />
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
