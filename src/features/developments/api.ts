import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type DevelopmentType = 'subdivision' | 'horizontal_condo' | 'vertical_condo' | 'launch'
export type DevelopmentStatus = 'draft' | 'active' | 'completed' | 'inactive'

export type Development = {
  id: string
  tenant_id: string
  name: string
  slug: string
  type: DevelopmentType
  developer: string | null
  status: DevelopmentStatus
  created_at: string
  updated_at: string
}

const DEVELOPMENT_COLUMNS = 'id, tenant_id, name, slug, type, developer, status, created_at, updated_at'

export function useDevelopments(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['developments', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Development[]> => {
      const { data, error } = await supabase
        .from('developments')
        .select(DEVELOPMENT_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export type DevelopmentInput = {
  name: string
  slug: string
  type: DevelopmentType
  developer: string
  status: DevelopmentStatus
}

export function useCreateDevelopment(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DevelopmentInput): Promise<Development> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('developments')
        .insert({
          tenant_id: tenantId,
          name: input.name,
          slug: input.slug,
          type: input.type,
          developer: input.developer || null,
          status: input.status,
          created_by: userData.user?.id ?? null,
        })
        .select(DEVELOPMENT_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (created) => {
      // Ver comentário equivalente em useCreateOwner — evita o Radix Select
      // "corrigir" o value pra vazio antes do cache ter o item novo.
      queryClient.setQueryData<Development[]>(['developments', tenantId], (old) =>
        old ? [...old, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) : [created],
      )
      queryClient.invalidateQueries({ queryKey: ['developments', tenantId] })
    },
  })
}

export function useUpdateDevelopment(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Omit<DevelopmentInput, 'slug'>): Promise<Development> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('developments')
        .update({
          name: input.name,
          type: input.type,
          developer: input.developer || null,
          status: input.status,
          updated_by: userData.user?.id ?? null,
        })
        .eq('id', id)
        .select(DEVELOPMENT_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developments', tenantId] })
    },
  })
}
