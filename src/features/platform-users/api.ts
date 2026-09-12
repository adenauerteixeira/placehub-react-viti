import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PlatformUser = {
  id: string
  full_name: string | null
  email: string
  created_at: string
}

export function usePlatformUsers() {
  return useQuery({
    queryKey: ['platform-users'],
    queryFn: async (): Promise<PlatformUser[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'super_admin')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useUpdatePlatformProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, full_name }: { id: string; full_name: string }) => {
      const { error } = await supabase.from('profiles').update({ full_name: full_name.trim() || null }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['platform-users'] })
    },
  })
}

export function useInvitePlatformUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, full_name }: { email: string; password: string; full_name: string }) => {
      const { data, error } = await supabase.functions.invoke('create-platform-user', {
        body: { email, password, full_name: full_name.trim() || null },
      })
      if (error) {
        let message = error.message
        try {
          const body = await error.context?.json()
          if (body?.error) message = body.error
        } catch { /* mantém o erro original */ }
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)
      return data.user as { id: string; email: string }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-users'] }),
  })
}
