import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const BUCKET = 'tenant-branding'

export type PaymentStatus = 'pending' | 'paid' | 'overdue'

export type BannerAd = {
  id: string
  tenant_id: string
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  link_url: string | null
  image_path: string | null
  payment_status: PaymentStatus
  starts_at: string | null
  ends_at: string | null
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

const BANNER_AD_COLUMNS =
  'id, tenant_id, company_name, contact_name, contact_email, contact_phone, link_url, image_path, payment_status, starts_at, ends_at, active, sort_order, created_at, updated_at'

export function bannerAdImageUrl(path: string | null, updatedAt: string): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${new Date(updatedAt).getTime()}`
}

/** Lista admin — todos os anúncios do tenant, ativos ou não, vencidos ou não. */
export function useBannerAds(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['banner-ads', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<BannerAd[]> => {
      const { data, error } = await supabase
        .from('tenant_banner_ads')
        .select(BANNER_AD_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('sort_order')

      if (error) throw error
      return data
    },
  })
}

/** Portal público — só anúncios ativos e dentro da vigência (RLS já filtra). */
export function usePublicBannerAds(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['public-banner-ads', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<BannerAd[]> => {
      const { data, error } = await supabase
        .from('tenant_banner_ads')
        .select(BANNER_AD_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('sort_order')

      if (error) throw error
      return data
    },
  })
}

export type BannerAdInput = {
  company_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  link_url: string
  payment_status: PaymentStatus
  starts_at: string
  ends_at: string
}

function toRow(input: BannerAdInput) {
  return {
    company_name: input.company_name,
    contact_name: input.contact_name || null,
    contact_email: input.contact_email || null,
    contact_phone: input.contact_phone || null,
    link_url: input.link_url || null,
    payment_status: input.payment_status,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
  }
}

export function useCreateBannerAd(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BannerAdInput): Promise<BannerAd> => {
      const { count } = await supabase
        .from('tenant_banner_ads')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      const { data, error } = await supabase
        .from('tenant_banner_ads')
        .insert({ tenant_id: tenantId, ...toRow(input), sort_order: count ?? 0 })
        .select(BANNER_AD_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banner-ads', tenantId] })
    },
  })
}

export function useUpdateBannerAd(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & BannerAdInput): Promise<BannerAd> => {
      const { data, error } = await supabase
        .from('tenant_banner_ads')
        .update(toRow(input))
        .eq('id', id)
        .select(BANNER_AD_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banner-ads', tenantId] })
    },
  })
}

export function useToggleBannerAdActive(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<void> => {
      const { error } = await supabase.from('tenant_banner_ads').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banner-ads', tenantId] })
    },
  })
}

/** Troca `sort_order` com o vizinho (subir/descer na lista) — mesmo padrão
 * de duas updates sequenciais do useSetCoverImage (announcements/api.ts). */
export function useMoveBannerAd(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ads,
      id,
      direction,
    }: {
      ads: BannerAd[]
      id: string
      direction: 'up' | 'down'
    }): Promise<void> => {
      const index = ads.findIndex((a) => a.id === id)
      const neighborIndex = direction === 'up' ? index - 1 : index + 1
      if (index === -1 || neighborIndex < 0 || neighborIndex >= ads.length) return

      const current = ads[index]
      const neighbor = ads[neighborIndex]

      const { error: firstError } = await supabase
        .from('tenant_banner_ads')
        .update({ sort_order: neighbor.sort_order })
        .eq('id', current.id)
      if (firstError) throw firstError

      const { error: secondError } = await supabase
        .from('tenant_banner_ads')
        .update({ sort_order: current.sort_order })
        .eq('id', neighbor.id)
      if (secondError) throw secondError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banner-ads', tenantId] })
    },
  })
}

export function useDeleteBannerAd(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ad: BannerAd): Promise<void> => {
      if (ad.image_path) {
        await supabase.storage.from(BUCKET).remove([ad.image_path])
      }
      const { error } = await supabase.from('tenant_banner_ads').delete().eq('id', ad.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banner-ads', tenantId] })
    },
  })
}

export function useUploadBannerAdImage(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ adId, file }: { adId: string; file: File }): Promise<string> => {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${tenantId}/banner-ads/${adId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('tenant_banner_ads')
        .update({ image_path: path })
        .eq('id', adId)
      if (updateError) throw updateError

      return path
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banner-ads', tenantId] })
    },
  })
}

export function useRemoveBannerAdImage(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ adId, currentPath }: { adId: string; currentPath: string }): Promise<void> => {
      await supabase.storage.from(BUCKET).remove([currentPath])
      const { error } = await supabase
        .from('tenant_banner_ads')
        .update({ image_path: null })
        .eq('id', adId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banner-ads', tenantId] })
    },
  })
}
