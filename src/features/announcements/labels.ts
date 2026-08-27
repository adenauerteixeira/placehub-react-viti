import type { Announcement, AnnouncementStatus, PropertyType, TransactionType } from './api'

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  lot: 'Terreno',
  house: 'Casa',
  apartment: 'Apartamento',
  farm: 'Chácara/Fazenda',
  commercial: 'Comercial',
  launch: 'Lançamento',
  assignment: 'Cessão (Ágio)',
}

export const PROPERTY_TYPE_ORDER = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]

export type AnnouncementSection = { type: PropertyType; label: string; items: Announcement[] }

/** Agrupa anúncios por tipo de imóvel, na ordem de PROPERTY_TYPE_LABELS,
 * descartando tipos sem nenhum anúncio — usado pelas duas variantes da home
 * pública (clássica e animada). */
export function groupAnnouncementsByType(announcements: Announcement[]): AnnouncementSection[] {
  return PROPERTY_TYPE_ORDER.map((type) => ({
    type,
    label: PROPERTY_TYPE_LABELS[type],
    items: announcements.filter((a) => a.property_type === type),
  })).filter((section) => section.items.length > 0)
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
