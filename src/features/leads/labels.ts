import type { LeadSource, LeadStatus } from './api'

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  manual: 'Manual',
  whatsapp: 'WhatsApp',
  portal: 'Portal',
  phone: 'Telefone',
  email: 'E-mail',
  other: 'Outro',
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  negotiating: 'Em negociação',
  converted: 'Convertido',
  lost: 'Perdido',
}

export const LEAD_STATUS_VARIANT: Record<LeadStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  new: 'outline',
  contacted: 'secondary',
  qualified: 'secondary',
  negotiating: 'default',
  converted: 'default',
  lost: 'destructive',
}
