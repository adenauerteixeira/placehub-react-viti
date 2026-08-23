import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { onlyDigits } from '@/lib/cpf-cnpj'

export type PersonType = 'PF' | 'PJ'

export type Partner = {
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

const PARTNER_COLUMNS =
  'id, tenant_id, name, person_type, document, phone, email, active, notes, created_at, updated_at'

export function usePartners(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['partners', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Partner[]> => {
      const { data, error } = await supabase
        .from('partners')
        .select(PARTNER_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('name')

      if (error) throw error
      return data
    },
  })
}

export type PartnerInput = {
  name: string
  person_type: PersonType
  document: string
  phone: string
  email: string
  notes: string
}

function toRow(input: PartnerInput) {
  return {
    name: input.name,
    person_type: input.person_type,
    document: input.document ? onlyDigits(input.document) : null,
    phone: input.phone || null,
    email: input.email || null,
    notes: input.notes || null,
  }
}

export function useCreatePartner(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PartnerInput): Promise<Partner> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('partners')
        .insert({ tenant_id: tenantId, ...toRow(input), created_by: userData.user?.id ?? null })
        .select(PARTNER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', tenantId] })
    },
  })
}

export function useUpdatePartner(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & PartnerInput): Promise<Partner> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('partners')
        .update({ ...toRow(input), updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(PARTNER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', tenantId] })
    },
  })
}

export function useTogglePartnerActive(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<Partner> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('partners')
        .update({ active, updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(PARTNER_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', tenantId] })
    },
  })
}
