import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Tenant = {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  active: boolean
  // Cores — tema claro
  primary_color: string
  secondary_color: string
  accent_color: string
  light_background_color: string
  light_surface_color: string
  light_text_color: string
  light_muted_text_color: string
  light_border_color: string
  // Cores — tema escuro
  dark_primary_color: string
  dark_accent_color: string
  dark_background_color: string
  dark_surface_color: string
  dark_text_color: string
  dark_muted_text_color: string
  dark_border_color: string
  // Fundo do logo
  logo_light_background_color: string
  logo_dark_background_color: string
  logo_light_background_transparent: boolean
  logo_dark_background_transparent: boolean
  // E-mails
  email_logo_path: string | null
  email_logo_background_color: string
  email_logo_background_transparent: boolean
  // Página pública
  public_hero_enabled: boolean
  public_home_variant: 'classic' | 'animated'
  animated_hero_show_image: boolean
  animated_hero_image_path: string | null
  animated_hero_show_particles: boolean
  // Imagens
  logo_light_path: string | null
  logo_dark_path: string | null
  favicon_path: string | null
  background_image_path: string | null
  placeholder_image_path: string | null
  created_at: string
  updated_at: string
}

const TENANT_COLUMNS =
  'id, name, slug, email, phone, active, primary_color, secondary_color, accent_color, light_background_color, light_surface_color, light_text_color, light_muted_text_color, light_border_color, dark_primary_color, dark_accent_color, dark_background_color, dark_surface_color, dark_text_color, dark_muted_text_color, dark_border_color, logo_light_background_color, logo_dark_background_color, logo_light_background_transparent, logo_dark_background_transparent, email_logo_path, email_logo_background_color, email_logo_background_transparent, public_hero_enabled, public_home_variant, animated_hero_show_image, animated_hero_image_path, animated_hero_show_particles, logo_light_path, logo_dark_path, favicon_path, background_image_path, placeholder_image_path, created_at, updated_at'

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

export type TenantAdmin = { tenant_id: string; email: string }

/** E-mails de todos os tenant_admin cadastrados, de todos os tenants — usado
 * pra listar na tabela de imobiliárias da plataforma (super_admin enxerga
 * profiles de qualquer tenant via RLS, ver profiles_select). */
export function useTenantAdmins() {
  return useQuery({
    queryKey: ['tenant-admins'],
    queryFn: async (): Promise<TenantAdmin[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('tenant_id, email')
        .eq('role', 'tenant_admin')
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as TenantAdmin[]
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
