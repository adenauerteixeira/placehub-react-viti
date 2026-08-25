import type { ReservationStatus } from './api'

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  active: 'Ativa',
  expired: 'Expirada',
  cancelled: 'Cancelada',
  converted: 'Convertida em venda',
}

export const RESERVATION_STATUS_VARIANT: Record<
  ReservationStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  active: 'default',
  expired: 'destructive',
  cancelled: 'destructive',
  converted: 'secondary',
}
