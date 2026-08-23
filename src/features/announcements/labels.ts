import type { AnnouncementStatus, PropertyType, TransactionType } from './api'

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  lot: 'Terreno',
  house: 'Casa',
  apartment: 'Apartamento',
  farm: 'Chácara/Fazenda',
  commercial: 'Comercial',
  launch: 'Lançamento',
  assignment: 'Cessão',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sale: 'Venda',
  rent: 'Aluguel',
}

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  reserved: 'Reservado',
  sold: 'Vendido',
  inactive: 'Inativo',
}

export const ANNOUNCEMENT_STATUS_VARIANT: Record<
  AnnouncementStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'outline',
  published: 'default',
  reserved: 'secondary',
  sold: 'secondary',
  inactive: 'destructive',
}
