import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile } from './use-profile'

const BUCKET = 'user-avatars'
const MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function profileAvatarUrl(path: string | null, updatedAt: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${updatedAt ? new Date(updatedAt).getTime() : ''}`
}

export function useUploadProfileAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profile, file }: { profile: Profile; file: File }) => {
      if (!ALLOWED_TYPES.has(file.type)) throw new Error('Envie uma imagem PNG, JPEG ou WebP.')
      if (file.size > MAX_SIZE) throw new Error('A imagem deve ter no máximo 2 MB.')

      const path = `${profile.id}/avatar`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', profile.id)
      if (updateError) throw updateError
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
}

export function useRemoveProfileAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profile: Profile) => {
      if (profile.avatar_path) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([profile.avatar_path])
        if (removeError) throw removeError
      }
      const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', profile.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  })
}
