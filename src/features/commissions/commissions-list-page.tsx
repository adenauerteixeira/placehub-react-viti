import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useSales } from '@/features/sales/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useCommissions, type Commission } from './api'
import { COMMISSION_STATUS_LABELS, COMMISSION_STATUS_VARIANT } from './labels'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function CommissionsListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: commissions, isLoading, isError, refetch } = useCommissions(tenant.id)
  const { data: sales } = useSales(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)

  const announcementTitle = (saleId: string) => {
    const sale = sales?.find((s) => s.id === saleId)
    return announcements?.find((a) => a.id === sale?.announcement_id)?.title ?? '—'
  }
  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  const columns: DataTableColumn<Commission>[] = [
    {
      id: 'announcement',
      accessorFn: (row) => announcementTitle(row.sale_id),
      header: 'Anúncio',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    },
    {
      id: 'broker',
      accessorFn: (row) => brokerName(row.broker_id),
      header: 'Corretor',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      accessorKey: 'gross_amount',
      header: 'Valor bruto',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatPrice(row.original.gross_amount)}</span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => COMMISSION_STATUS_LABELS[row.status],
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={COMMISSION_STATUS_VARIANT[row.original.status]}>
          {COMMISSION_STATUS_LABELS[row.original.status]}
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
            onClick={() => navigate(`/commissions/${row.original.id}`)}
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
        <CardTitle>Comissões</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && (
          <ErrorState title="Não foi possível carregar as comissões." onRetry={() => refetch()} />
        )}
        {commissions && commissions.length === 0 && (
          <EmptyState
            title="Nenhuma comissão ainda"
            description="Elas são geradas automaticamente ao fechar uma venda."
          />
        )}
        {commissions && commissions.length > 0 && (
          <DataTable columns={columns} data={commissions} searchPlaceholder="Buscar por anúncio, corretor..." />
        )}
      </CardContent>
    </Card>
  )
}
