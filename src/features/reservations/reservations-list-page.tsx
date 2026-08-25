import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAnnouncements } from '@/features/announcements/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { errorMessage } from '@/lib/errors'
import { useCancelReservation, useReservations, type Reservation } from './api'
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_VARIANT } from './labels'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function ReservationsListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: reservations, isLoading, isError } = useReservations(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const cancelReservation = useCancelReservation(tenant.id)

  const announcementTitle = (id: string) => announcements?.find((a) => a.id === id)?.title ?? '—'

  async function handleCancel(reservation: Reservation) {
    const reason = window.prompt('Motivo do cancelamento (opcional):') ?? ''
    try {
      await cancelReservation.mutateAsync({ id: reservation.id, reason })
      toast.success('Reserva cancelada.')
    } catch (error) {
      toast.error('Não foi possível cancelar', { description: errorMessage(error) })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && <p className="text-destructive text-sm">Não foi possível carregar as reservas.</p>}
        {reservations && reservations.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma reserva ainda — reserve um imóvel a partir de Anúncios ou de uma negociação.
          </p>
        )}
        {reservations && reservations.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anúncio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell className="font-medium">{announcementTitle(reservation.announcement_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{reservation.customer_name}</TableCell>
                  <TableCell>
                    <Badge variant={RESERVATION_STATUS_VARIANT[reservation.status]}>
                      {RESERVATION_STATUS_LABELS[reservation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(reservation.expires_at)}</TableCell>
                  <TableCell>
                    {reservation.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Cancelar reserva"
                        onClick={() => handleCancel(reservation)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
