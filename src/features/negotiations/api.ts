import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type NegotiationStatus = 'open' | 'visit' | 'proposal' | 'negotiating' | 'won' | 'lost'

export type Negotiation = {
  id: string
  tenant_id: string
  lead_id: string
  announcement_id: string | null
  broker_id: string | null
  status: NegotiationStatus
  started_at: string
  next_contact_at: string | null
  closed_at: string | null
  lost_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const NEGOTIATION_COLUMNS =
  'id, tenant_id, lead_id, announcement_id, broker_id, status, started_at, next_contact_at, closed_at, lost_reason, notes, created_at, updated_at'

export function useNegotiations(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['negotiations', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Negotiation[]> => {
      const { data, error } = await supabase
        .from('negotiations')
        .select(NEGOTIATION_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useNegotiationsByLead(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ['negotiations-by-lead', leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<Negotiation[]> => {
      const { data, error } = await supabase
        .from('negotiations')
        .select(NEGOTIATION_COLUMNS)
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useNegotiation(id: string | null | undefined) {
  return useQuery({
    queryKey: ['negotiation', id],
    enabled: !!id,
    queryFn: async (): Promise<Negotiation> => {
      const { data, error } = await supabase
        .from('negotiations')
        .select(NEGOTIATION_COLUMNS)
        .eq('id', id!)
        .single()

      if (error) throw error
      return data
    },
  })
}

export type NegotiationInput = {
  lead_id: string
  announcement_id: string
  broker_id: string
  next_contact_at: string
  notes: string
}

function toRow(input: NegotiationInput) {
  return {
    lead_id: input.lead_id,
    announcement_id: input.announcement_id || null,
    broker_id: input.broker_id || null,
    next_contact_at: input.next_contact_at ? new Date(input.next_contact_at).toISOString() : null,
    notes: input.notes || null,
  }
}

export function useCreateNegotiation(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: NegotiationInput): Promise<Negotiation> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('negotiations')
        .insert({ tenant_id: tenantId, ...toRow(input), created_by: userData.user?.id ?? null })
        .select(NEGOTIATION_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (negotiation) => {
      queryClient.invalidateQueries({ queryKey: ['negotiations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['negotiations-by-lead', negotiation.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['lead', negotiation.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] })
    },
  })
}

export function useUpdateNegotiation(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      lost_reason,
      ...input
    }: { id: string; status?: NegotiationStatus; lost_reason?: string } & NegotiationInput): Promise<Negotiation> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('negotiations')
        .update({
          ...toRow(input),
          ...(status ? { status } : {}),
          ...(lost_reason !== undefined ? { lost_reason: lost_reason || null } : {}),
          updated_by: userData.user?.id ?? null,
        })
        .eq('id', id)
        .select(NEGOTIATION_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (negotiation) => {
      queryClient.invalidateQueries({ queryKey: ['negotiations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiation.id] })
      queryClient.invalidateQueries({ queryKey: ['negotiations-by-lead', negotiation.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['lead', negotiation.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] })
    },
  })
}
