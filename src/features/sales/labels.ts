import type { InstallmentStatus, SaleStatus } from './api'

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

export const SALE_STATUS_VARIANT: Record<SaleStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  completed: 'default',
  cancelled: 'destructive',
}

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pendente',
  received: 'Recebida',
}
