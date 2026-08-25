import type { ProposalStatus } from './api'

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  countered: 'Contraproposta',
  accepted: 'Aceita',
  rejected: 'Recusada',
  expired: 'Expirada',
  cancelled: 'Cancelada',
}

export const PROPOSAL_STATUS_VARIANT: Record<ProposalStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  sent: 'secondary',
  countered: 'secondary',
  accepted: 'default',
  rejected: 'destructive',
  expired: 'destructive',
  cancelled: 'destructive',
}
