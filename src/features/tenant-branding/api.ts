import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type BrandingAsset =
  | 'logo-light'
  | 'logo-dark'
  | 'email-logo'
  | 'background-image'
  | 'animated-hero-image'
  | 'favicon'
  | 'placeholder-image'

const BUCKET = 'tenant-branding'

const PATH_COLUMN: Record<
  BrandingAsset,
  | 'logo_light_path'
  | 'logo_dark_path'
  | 'email_logo_path'
  | 'background_image_path'
  | 'animated_hero_image_path'
  | 'favicon_path'
  | 'placeholder_image_path'
> = {
  'logo-light': 'logo_light_path',
  'logo-dark': 'logo_dark_path',
  'email-logo': 'email_logo_path',
  'background-image': 'background_image_path',
  'animated-hero-image': 'animated_hero_image_path',
  favicon: 'favicon_path',
  'placeholder-image': 'placeholder_image_path',
}

export function brandingAssetUrl(path: string | null, updatedAt: string): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${new Date(updatedAt).getTime()}`
}

export type TenantColorsInput = {
  primary_color: string
  secondary_color: string
  accent_color: string
  light_background_color: string
  light_surface_color: string
  light_text_color: string
  light_muted_text_color: string
  light_border_color: string
  dark_primary_color: string
  dark_accent_color: string
  dark_background_color: string
  dark_surface_color: string
  dark_text_color: string
  dark_muted_text_color: string
  dark_border_color: string
  logo_light_background_color: string
  logo_dark_background_color: string
  logo_light_background_transparent: boolean
  logo_dark_background_transparent: boolean
  email_logo_background_color: string
  email_logo_background_transparent: boolean
  public_hero_enabled: boolean
  public_home_variant: 'classic' | 'animated'
  animated_hero_show_image: boolean
  animated_hero_show_particles: boolean
  training_enabled: boolean
}

export function useUpdateTenantColors(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TenantColorsInput) => {
      const { error } = await supabase.from('tenants').update(input).eq('id', tenantId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
  })
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async (to: string) => {
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: { type: 'test', to },
      })
      if (error) {
        let message = error.message
        try {
          const body = await error.context?.json()
          if (body?.error) message = body.error
        } catch {
          // resposta sem corpo JSON legível — mantém error.message
        }
        throw new Error(message)
      }
      if (!data?.sent) throw new Error(data?.reason || 'Falha ao enviar o e-mail de teste.')
      return data
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

export function useRemoveBrandingAsset(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ asset, currentPath }: { asset: BrandingAsset; currentPath: string }) => {
      await supabase.storage.from(BUCKET).remove([currentPath])

      const { error } = await supabase
        .from('tenants')
        .update({ [PATH_COLUMN[asset]]: null })
        .eq('id', tenantId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
    },
  })
}
