import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { onlyDigits } from '@/lib/cpf-cnpj'
import type { PersonType } from '@/features/partners/api'

export type Owner = {
  id: string
  tenant_id: string
  name: string
  person_type: PersonType
  document: string | null
  phone: string | null
  email: string | null
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

const OWNER_COLUMNS =
  'id, tenant_id, name, person_type, document, phone, email, active, notes, created_at, updated_at'

export function useOwners(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['owners', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Owner[]> => {
      const { data, error } = await supabase
        .from('owners')
        .select(OWNER_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export type OwnerInput = {
  name: string
  person_type: PersonType
  document: string
  phone: string
  email: string
  notes: string
}

function toRow(input: OwnerInput) {
  return {
    name: input.name,
    person_type: input.person_type,
    document: input.document ? onlyDigits(input.document) : null,
    phone: input.phone || null,
    email: input.email || null,
    notes: input.notes || null,
  }
}

export function useCreateOwner(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: OwnerInput): Promise<Owner> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('owners')
        .insert({ tenant_id: tenantId, ...toRow(input), created_by: userData.user?.id ?? null })
        .select(OWNER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners', tenantId] })
    },
  })
}

export function useUpdateOwner(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & OwnerInput): Promise<Owner> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('owners')
        .update({ ...toRow(input), updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(OWNER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners', tenantId] })
    },
  })
}

export function useToggleOwnerActive(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<Owner> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('owners')
        .update({ active, updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(OWNER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners', tenantId] })
    },
  })
}
