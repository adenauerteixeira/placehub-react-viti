import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { TableSkeleton } from '@/components/table-skeleton'
import { useAnnouncements } from '@/features/announcements/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage } from '@/lib/errors'
import { useCancelReservation, useReservations, type Reservation } from './api'
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_VARIANT } from './labels'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function ReservationsListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: reservations, isLoading, isError, refetch } = useReservations(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const cancelReservation = useCancelReservation(tenant.id)
  const { confirmWithReason } = useConfirm()

  const announcementTitle = (id: string) => announcements?.find((a) => a.id === id)?.title ?? '—'

  async function handleCancel(reservation: Reservation) {
    const reason = await confirmWithReason({
      title: 'Cancelar reserva',
      description: 'Essa ação não pode ser desfeita.',
      reasonLabel: 'Motivo do cancelamento (opcional)',
      confirmLabel: 'Cancelar reserva',
      variant: 'destructive',
    })
    if (reason === null) return
    try {
      await cancelReservation.mutateAsync({ id: reservation.id, reason })
      toast.success('Reserva cancelada.')
    } catch (error) {
      toast.error('Não foi possível cancelar', { description: errorMessage(error) })
    }
  }

  const columns: DataTableColumn<Reservation>[] = [
    {
      id: 'announcement',
      accessorFn: (row) => announcementTitle(row.announcement_id),
      header: 'Anúncio',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    },
    {
      accessorKey: 'customer_name',
      header: 'Cliente',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.customer_name}</span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => RESERVATION_STATUS_LABELS[row.status],
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={RESERVATION_STATUS_VARIANT[row.original.status]}>
          {RESERVATION_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'expires_at',
      header: 'Expira em',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDateTime(row.original.expires_at)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) =>
        row.original.status === 'active' ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cancelar reserva"
              onClick={() => handleCancel(row.original)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <TableSkeleton columns={5} />}
        {isError && (
          <ErrorState title="Não foi possível carregar as reservas." onRetry={() => refetch()} />
        )}
        {reservations && reservations.length === 0 && (
          <EmptyState
            title="Nenhuma reserva ainda"
            description="Reserve um imóvel a partir de Anúncios ou de uma negociação."
          />
        )}
        {reservations && reservations.length > 0 && (
          <DataTable columns={columns} data={reservations} searchPlaceholder="Buscar por cliente, anúncio..." />
        )}
      </CardContent>
    </Card>
  )
}
