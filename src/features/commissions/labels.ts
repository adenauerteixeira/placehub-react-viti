import type { CommissionInstallmentStatus, CommissionStatus } from './api'

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  expected: 'Prevista',
  receivable: 'A receber',
  received: 'Recebida',
  paid: 'Paga',
  cancelled: 'Cancelada',
}

export const COMMISSION_STATUS_VARIANT: Record<CommissionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  expected: 'outline',
  receivable: 'secondary',
  received: 'secondary',
  paid: 'default',
  cancelled: 'destructive',
}

export const COMMISSION_INSTALLMENT_STATUS_LABELS: Record<CommissionInstallmentStatus, string> = {
  pending: 'Pendente',
  received: 'Recebida do cliente',
  awaiting_confirmation: 'Aguardando confirmação',
  paid: 'Paga ao corretor',
}
