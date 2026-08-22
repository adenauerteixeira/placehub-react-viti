import { useQuery } from '@tanstack/react-query'
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
