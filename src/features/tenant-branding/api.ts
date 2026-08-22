import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type BrandingAsset = 'logo-light' | 'logo-dark' | 'favicon'

const BUCKET = 'tenant-branding'
const PATH_COLUMN: Record<BrandingAsset, 'logo_light_path' | 'logo_dark_path' | 'favicon_path'> = {
  'logo-light': 'logo_light_path',
  'logo-dark': 'logo_dark_path',
  favicon: 'favicon_path',
}

export function brandingAssetUrl(path: string | null, updatedAt: string): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${new Date(updatedAt).getTime()}`
}

export function useUpdateTenantColors(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { primary_color: string; accent_color: string }) => {
      const { error } = await supabase.from('tenants').update(input).eq('id', tenantId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
  })
}

export function useUploadBrandingAsset(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ asset, file }: { asset: BrandingAsset; file: File }) => {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${tenantId}/${asset}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ [PATH_COLUMN[asset]]: path })
        .eq('id', tenantId)
      if (updateError) throw updateError

      return path
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
  })
}
