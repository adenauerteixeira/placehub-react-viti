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
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useSales, type Sale } from './api'
import { SALE_STATUS_LABELS, SALE_STATUS_VARIANT } from './labels'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function SalesListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: sales, isLoading, isError, refetch } = useSales(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)

  const announcementTitle = (id: string | null) => announcements?.find((a) => a.id === id)?.title ?? '—'
  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  const columns: DataTableColumn<Sale>[] = [
    {
      id: 'announcement',
      accessorFn: (row) => announcementTitle(row.announcement_id),
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
      accessorKey: 'amount',
      header: 'Valor',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatPrice(row.original.amount)}</span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => SALE_STATUS_LABELS[row.status],
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={SALE_STATUS_VARIANT[row.original.status]}>
          {SALE_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'sold_at',
      header: 'Vendido em',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.sold_at)}</span>
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
            onClick={() => navigate(`/sales/${row.original.id}`)}
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
        <CardTitle>Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && <ErrorState title="Não foi possível carregar as vendas." onRetry={() => refetch()} />}
        {sales && sales.length === 0 && (
          <EmptyState
            title="Nenhuma venda ainda"
            description="Feche uma venda a partir de uma proposta aceita, no hub da negociação."
          />
        )}
        {sales && sales.length > 0 && (
          <DataTable columns={columns} data={sales} searchPlaceholder="Buscar por anúncio, corretor..." />
        )}
      </CardContent>
    </Card>
  )
}
