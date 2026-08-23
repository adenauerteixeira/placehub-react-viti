import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const BUCKET = 'catalog-media'

export type PropertyType = 'lot' | 'house' | 'apartment' | 'farm' | 'commercial' | 'launch' | 'assignment'
export type TransactionType = 'sale' | 'rent'
export type AnnouncementStatus = 'draft' | 'published' | 'reserved' | 'sold' | 'inactive'

export type Announcement = {
  id: string
  tenant_id: string
  title: string
  subtitle: string | null
  slug: string
  reference_code: string | null
  description: string | null
  property_type: PropertyType
  transaction_type: TransactionType
  status: AnnouncementStatus
  price: number
  promotional_price: number | null
  featured: boolean
  promotion: boolean
  video_url: string | null
  zip_code: string | null
  street: string | null
  address_number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  bedrooms: number | null
  suites: number | null
  bathrooms: number | null
  parking_spaces: number | null
  land_area: number | null
  built_area: number | null
  private_area: number | null
  condominium_fee: number | null
  iptu: number | null
  development_id: string | null
  partner_id: string | null
  owner_id: string | null
  broker_id: string | null
  responsible_profile_id: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type AnnouncementImage = {
  id: string
  announcement_id: string
  path: string
  caption: string | null
  sort_order: number
  is_cover: boolean
}

const ANNOUNCEMENT_COLUMNS =
  'id, tenant_id, title, subtitle, slug, reference_code, description, property_type, transaction_type, status, price, promotional_price, featured, promotion, video_url, zip_code, street, address_number, complement, neighborhood, city, state, bedrooms, suites, bathrooms, parking_spaces, land_area, built_area, private_area, condominium_fee, iptu, development_id, partner_id, owner_id, broker_id, responsible_profile_id, published_at, created_at, updated_at'

export function announcementImageUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export function useAnnouncements(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['announcements', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select(ANNOUNCEMENT_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useAnnouncement(id: string | null | undefined) {
  return useQuery({
    queryKey: ['announcement', id],
    enabled: !!id,
    queryFn: async (): Promise<Announcement> => {
      const { data, error } = await supabase
        .from('announcements')
        .select(ANNOUNCEMENT_COLUMNS)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data
    },
  })
}

export function useAnnouncementImages(announcementId: string | null | undefined) {
  return useQuery({
    queryKey: ['announcement-images', announcementId],
    enabled: !!announcementId,
    queryFn: async (): Promise<AnnouncementImage[]> => {
      const { data, error } = await supabase
        .from('announcement_images')
        .select('id, announcement_id, path, caption, sort_order, is_cover')
        .eq('announcement_id', announcementId!)
        .order('sort_order')

      if (error) throw error
      return data
    },
  })
}

export function useAnnouncementAmenities(announcementId: string | null | undefined) {
  return useQuery({
    queryKey: ['announcement-amenities', announcementId],
    enabled: !!announcementId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('announcement_amenities')
        .select('amenity_key')
        .eq('announcement_id', announcementId!)

      if (error) throw error
      return data.map((row) => row.amenity_key)
    },
  })
}

export function useAmenitiesCatalog() {
  return useQuery({
    queryKey: ['amenities'],
    queryFn: async (): Promise<{ key: string; label: string }[]> => {
      const { data, error } = await supabase.from('amenities').select('key, label').order('label')
      if (error) throw error
      return data
    },
  })
}

export type AnnouncementInput = {
  title: string
  subtitle: string
  reference_code: string
  description: string
  property_type: PropertyType
  transaction_type: TransactionType
  price: number
  promotional_price: number | null
  featured: boolean
  promotion: boolean
  video_url: string
  zip_code: string
  street: string
  address_number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  bedrooms: number | null
  suites: number | null
  bathrooms: number | null
  parking_spaces: number | null
  land_area: number | null
  built_area: number | null
  private_area: number | null
  condominium_fee: number | null
  iptu: number | null
  development_id: string | null
  partner_id: string | null
  owner_id: string | null
  broker_id: string | null
  responsible_profile_id: string | null
}

function toRow(input: AnnouncementInput) {
  return {
    title: input.title,
    subtitle: input.subtitle || null,
    reference_code: input.reference_code || null,
    description: input.description || null,
    property_type: input.property_type,
    transaction_type: input.transaction_type,
    price: input.price,
    promotional_price: input.promotional_price,
    featured: input.featured,
    promotion: input.promotion,
    video_url: input.video_url || null,
    zip_code: input.zip_code || null,
    street: input.street || null,
    address_number: input.address_number || null,
    complement: input.complement || null,
    neighborhood: input.neighborhood || null,
    city: input.city || null,
    state: input.state || null,
    bedrooms: input.bedrooms,
    suites: input.suites,
    bathrooms: input.bathrooms,
    parking_spaces: input.parking_spaces,
    land_area: input.land_area,
    built_area: input.built_area,
    private_area: input.private_area,
    condominium_fee: input.condominium_fee,
    iptu: input.iptu,
    development_id: input.development_id,
    partner_id: input.partner_id,
    owner_id: input.owner_id,
    broker_id: input.broker_id,
    responsible_profile_id: input.responsible_profile_id,
  }
}

export function useCreateAnnouncement(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AnnouncementInput & { slug: string }): Promise<Announcement> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          tenant_id: tenantId,
          slug: input.slug,
          status: 'draft',
          ...toRow(input),
          created_by: userData.user?.id ?? null,
        })
        .select(ANNOUNCEMENT_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] })
    },
  })
}

export function useUpdateAnnouncement(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      ...input
    }: { id: string; status?: AnnouncementStatus } & AnnouncementInput): Promise<Announcement> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('announcements')
        .update({
          ...toRow(input),
          ...(status ? { status } : {}),
          updated_by: userData.user?.id ?? null,
        })
        .eq('id', id)
        .select(ANNOUNCEMENT_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (announcement) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['announcement', announcement.id] })
    },
  })
}

export function useDeleteAnnouncement(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: images } = await supabase
        .from('announcement_images')
        .select('path')
        .eq('announcement_id', id)

      if (images && images.length > 0) {
        await supabase.storage.from(BUCKET).remove(images.map((img) => img.path))
      }

      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] })
    },
  })
}

export function useUploadAnnouncementImage(announcementId: string, tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<AnnouncementImage> => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${tenantId}/announcements/${announcementId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type })
      if (uploadError) throw uploadError

      const { count } = await supabase
        .from('announcement_images')
        .select('id', { count: 'exact', head: true })
        .eq('announcement_id', announcementId)

      const { data, error } = await supabase
        .from('announcement_images')
        .insert({
          tenant_id: tenantId,
          announcement_id: announcementId,
          path,
          sort_order: count ?? 0,
          is_cover: (count ?? 0) === 0,
        })
        .select('id, announcement_id, path, caption, sort_order, is_cover')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-images', announcementId] })
    },
  })
}

export function useRemoveAnnouncementImage(announcementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (image: AnnouncementImage): Promise<void> => {
      await supabase.storage.from(BUCKET).remove([image.path])
      const { error } = await supabase.from('announcement_images').delete().eq('id', image.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-images', announcementId] })
    },
  })
}

export function useSetCoverImage(announcementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (imageId: string): Promise<void> => {
      const { error: unsetError } = await supabase
        .from('announcement_images')
        .update({ is_cover: false })
        .eq('announcement_id', announcementId)
        .eq('is_cover', true)
      if (unsetError) throw unsetError

      const { error: setError } = await supabase
        .from('announcement_images')
        .update({ is_cover: true })
        .eq('id', imageId)
      if (setError) throw setError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-images', announcementId] })
    },
  })
}

export function useSetAmenities(announcementId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keys: string[]): Promise<void> => {
      const { error: deleteError } = await supabase
        .from('announcement_amenities')
        .delete()
        .eq('announcement_id', announcementId)
      if (deleteError) throw deleteError

      if (keys.length > 0) {
        const { error: insertError } = await supabase
          .from('announcement_amenities')
          .insert(keys.map((amenity_key) => ({ announcement_id: announcementId, amenity_key })))
        if (insertError) throw insertError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement-amenities', announcementId] })
    },
  })
}
