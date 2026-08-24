import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AssignableRole } from './permissions'

export type TenantUser = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  creci: string | null
  creci_state: string | null
  role: AssignableRole | 'super_admin'
  is_active: boolean
  created_at: string
  profile_permissions: { permission_key: string }[]
}

const TENANT_USER_COLUMNS =
  'id, email, full_name, phone, creci, creci_state, role, is_active, created_at, profile_permissions(permission_key)'

export function useTenantUsers(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['tenant-users', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantUser[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(TENANT_USER_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

export type InviteUserInput = {
  email: string
  password: string
  full_name: string
  role: AssignableRole
  permissions: string[]
  creci: string
  creci_state: string
}

export function useInviteTenantUser(tenantId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InviteUserInput) => {
      const { data, error } = await supabase.functions.invoke('invite-tenant-user', {
        body: {
          email: input.email,
          password: input.password,
          full_name: input.full_name || null,
          role: input.role,
          permissions: input.permissions,
          creci: input.creci || null,
          creci_state: input.creci_state || null,
        },
      })

      if (error) {
        let message = error.message
        try {
          const body = await error.context?.json()
          if (body?.error) message = body.error
        } catch {
          // sem corpo JSON legível — mantém error.message
        }
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)

      return data.user as { id: string; email: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
  })
}

export type UpdateTenantUserInput = {
  id: string
  full_name: string
  phone: string
  creci: string
  creci_state: string
  role: AssignableRole
  is_active: boolean
  permissions: string[]
  currentPermissions: string[]
}

export function useUpdateTenantUser(tenantId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateTenantUserInput) => {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: input.full_name || null,
          phone: input.phone || null,
          creci: input.creci || null,
          creci_state: input.creci_state || null,
          role: input.role,
          is_active: input.is_active,
        })
        .eq('id', input.id)

      if (updateError) throw updateError

      const toAdd = input.permissions.filter((p) => !input.currentPermissions.includes(p))
      const toRemove = input.currentPermissions.filter((p) => !input.permissions.includes(p))

      if (toAdd.length > 0) {
        const { error } = await supabase
          .from('profile_permissions')
          .insert(toAdd.map((permission_key) => ({ profile_id: input.id, permission_key })))
        if (error) throw error
      }
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('profile_permissions')
          .delete()
          .eq('profile_id', input.id)
          .in('permission_key', toRemove)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
  })
}

export function useUpdateTenantUserEmail(tenantId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ user_id, email }: { user_id: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke('update-tenant-user-email', {
        body: { user_id, email },
      })

      if (error) {
        let message = error.message
        try {
          const body = await error.context?.json()
          if (body?.error) message = body.error
        } catch {
          // sem corpo JSON legível — mantém error.message
        }
        throw new Error(message)
      }
      if (data?.error) throw new Error(data.error)

      return data.user as { id: string; email: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
  })
}

export function useToggleTenantUserActive(tenantId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] })
    },
  })
}
