import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'

export type ProfileRole = 'super_admin' | 'tenant_admin' | 'manager' | 'broker'

export type Profile = {
  id: string
  tenant_id: string | null
  role: ProfileRole
  full_name: string | null
  email: string
  phone: string | null
  creci: string | null
  is_active: boolean
  permissions: string[]
}

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, tenant_id, role, full_name, email, phone, creci, is_active, profile_permissions(permission_key)',
        )
        .eq('id', user!.id)
        .single()

      if (error) throw error
      const { profile_permissions, ...profile } = data
      return {
        ...profile,
        permissions: profile_permissions.map((p) => p.permission_key),
      }
    },
  })
}

/** tenant_admin/super_admin sempre têm acesso a todo módulo do próprio
 * tenant; manager/broker só se o módulo estiver em profile.permissions
 * (mesma regra de has_permission() no banco — RLS é quem garante de
 * verdade, isto é só pra não mostrar link/rota que a API vai recusar). */
export function hasPermission(profile: Profile | undefined, moduleKey: string): boolean {
  if (!profile) return false
  if (profile.role === 'super_admin' || profile.role === 'tenant_admin') return true
  return profile.permissions.includes(moduleKey)
}
