import type { NegotiationStatus } from './api'

export const NEGOTIATION_STATUS_LABELS: Record<NegotiationStatus, string> = {
  open: 'Em atendimento',
  visit: 'Visita',
  proposal: 'Proposta',
  negotiating: 'Negociação',
  won: 'Ganha',
  lost: 'Perdida',
}

export const NEGOTIATION_STATUS_VARIANT: Record<
  NegotiationStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  open: 'outline',
  visit: 'secondary',
  proposal: 'secondary',
  negotiating: 'default',
  won: 'default',
  lost: 'destructive',
}
