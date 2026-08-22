import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Tenant = {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  active: boolean
  primary_color: string
  accent_color: string
  created_at: string
}

const TENANT_COLUMNS =
  'id, name, slug, email, phone, active, primary_color, accent_color, created_at'

export function useTenant(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Tenant> => {
      const { data, error } = await supabase
        .from('tenants')
        .select(TENANT_COLUMNS)
        .eq('id', tenantId!)
        .single()

      if (error) throw error
      return data
    },
  })
}

/** Busca por slug, para o portal público (visitante sem sessão). */
export function usePublicTenant(slug: string | null) {
  return useQuery({
    queryKey: ['public-tenant', slug],
    enabled: !!slug,
    queryFn: async (): Promise<Tenant | null> => {
      const { data, error } = await supabase
        .from('tenants')
        .select(TENANT_COLUMNS)
        .eq('slug', slug!)
        .eq('active', true)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async (): Promise<Tenant[]> => {
      const { data, error } = await supabase
        .from('tenants')
        .select(TENANT_COLUMNS)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export type TenantInput = {
  name: string
  slug: string
  email: string
  phone: string
}

export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TenantInput): Promise<Tenant> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: input.name,
          slug: input.slug,
          email: input.email || null,
          phone: input.phone || null,
          created_by: userData.user?.id ?? null,
        })
        .select(TENANT_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Omit<TenantInput, 'slug'>): Promise<Tenant> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('tenants')
        .update({
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          updated_by: userData.user?.id ?? null,
        })
        .eq('id', id)
        .select(TENANT_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenant.id] })
    },
  })
}

export function useToggleTenantActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<Tenant> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('tenants')
        .update({ active, updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(TENANT_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenant.id] })
    },
  })
}
