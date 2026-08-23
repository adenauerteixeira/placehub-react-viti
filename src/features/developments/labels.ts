import type { DevelopmentStatus, DevelopmentType } from './api'

export const DEVELOPMENT_TYPE_LABELS: Record<DevelopmentType, string> = {
  subdivision: 'Loteamento',
  horizontal_condo: 'Condomínio horizontal',
  vertical_condo: 'Condomínio vertical',
  launch: 'Lançamento',
}

export const DEVELOPMENT_STATUS_LABELS: Record<DevelopmentStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  completed: 'Concluído',
  inactive: 'Inativo',
}

export const DEVELOPMENT_STATUS_VARIANT: Record<
  DevelopmentStatus,
  'default' | 'secondary' | 'outline'
> = {
  draft: 'outline',
  active: 'default',
  completed: 'secondary',
  inactive: 'outline',
}
