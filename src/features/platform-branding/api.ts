import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PlatformSettings = {
  favicon_path: string | null
  logo_light_path: string | null
  logo_dark_path: string | null
  background_image_path: string | null
  updated_at: string
}

export type PlatformBrandingAsset = 'favicon' | 'logo-light' | 'logo-dark' | 'background-image'

const BUCKET = 'platform-branding'

const PATH_COLUMN: Record<
  PlatformBrandingAsset,
  'favicon_path' | 'logo_light_path' | 'logo_dark_path' | 'background_image_path'
> = {
  favicon: 'favicon_path',
  'logo-light': 'logo_light_path',
  'logo-dark': 'logo_dark_path',
  'background-image': 'background_image_path',
}

export function platformBrandingAssetUrl(path: string | null, updatedAt: string): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${new Date(updatedAt).getTime()}`
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async (): Promise<PlatformSettings> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('favicon_path, logo_light_path, logo_dark_path, background_image_path, updated_at')
        .eq('id', true)
        .single()

      if (error) throw error
      return data
    },
  })
}

export function useUploadPlatformBrandingAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ asset, file }: { asset: PlatformBrandingAsset; file: File }) => {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${asset}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: userData } = await supabase.auth.getUser()
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({ [PATH_COLUMN[asset]]: path, updated_by: userData.user?.id ?? null })
        .eq('id', true)
      if (updateError) throw updateError

      return path
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
    },
  })
}

export function useRemovePlatformBrandingAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      asset,
      currentPath,
    }: {
      asset: PlatformBrandingAsset
      currentPath: string
    }) => {
      await supabase.storage.from(BUCKET).remove([currentPath])

      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('platform_settings')
        .update({ [PATH_COLUMN[asset]]: null, updated_by: userData.user?.id ?? null })
        .eq('id', true)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] })
    },
  })
}
