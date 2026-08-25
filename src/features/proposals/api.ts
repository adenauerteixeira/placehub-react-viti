import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ProposalStatus = 'draft' | 'sent' | 'countered' | 'accepted' | 'rejected' | 'expired' | 'cancelled'

export type Proposal = {
  id: string
  tenant_id: string
  negotiation_id: string
  amount: number
  status: ProposalStatus
  valid_until: string | null
  payment_terms: string | null
  notes: string | null
  sent_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
}

const PROPOSAL_COLUMNS =
  'id, tenant_id, negotiation_id, amount, status, valid_until, payment_terms, notes, sent_at, accepted_at, rejected_at, created_at, updated_at'

export function useProposalsByNegotiation(negotiationId: string | null | undefined) {
  return useQuery({
    queryKey: ['proposals', negotiationId],
    enabled: !!negotiationId,
    queryFn: async (): Promise<Proposal[]> => {
      const { data, error } = await supabase
        .from('proposals')
        .select(PROPOSAL_COLUMNS)
        .eq('negotiation_id', negotiationId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export type ProposalInput = {
  amount: number | null
  valid_until: string
  payment_terms: string
  notes: string
}

function toRow(input: ProposalInput) {
  return {
    amount: input.amount ?? 0,
    valid_until: input.valid_until || null,
    payment_terms: input.payment_terms || null,
    notes: input.notes || null,
  }
}

export function useCreateProposal(negotiationId: string, tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ProposalInput): Promise<Proposal> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          tenant_id: tenantId,
          negotiation_id: negotiationId,
          ...toRow(input),
          created_by: userData.user?.id ?? null,
        })
        .select(PROPOSAL_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', negotiationId] })
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] })
      queryClient.invalidateQueries({ queryKey: ['negotiations'] })
    },
  })
}

export function useUpdateProposal(negotiationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      ...input
    }: { id: string; status?: ProposalStatus } & ProposalInput): Promise<Proposal> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('proposals')
        .update({ ...toRow(input), ...(status ? { status } : {}), updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(PROPOSAL_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', negotiationId] })
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] })
      queryClient.invalidateQueries({ queryKey: ['negotiations'] })
    },
  })
}

export function useDeleteProposal(negotiationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proposals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', negotiationId] })
    },
  })
}
