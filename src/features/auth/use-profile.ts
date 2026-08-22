import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'

export type ProfileRole = 'super_admin' | 'tenant_admin' | 'manager' | 'broker'

export type Profile = {
  id: string
  tenant_id: string | null
  role: ProfileRole
  full_name: string | null
  phone: string | null
  creci: string | null
  is_active: boolean
}

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, tenant_id, role, full_name, phone, creci, is_active')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data
    },
  })
}
