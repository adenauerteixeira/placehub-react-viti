import type { PaymentStatus } from './api'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
}

export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  paid: 'default',
  overdue: 'destructive',
}
