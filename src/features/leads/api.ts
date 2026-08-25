import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type LeadSource = 'manual' | 'whatsapp' | 'portal' | 'phone' | 'email' | 'other'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'negotiating' | 'converted' | 'lost'

export type Lead = {
  id: string
  tenant_id: string
  announcement_id: string | null
  broker_id: string | null
  name: string
  phone: string | null
  email: string | null
  source: LeadSource
  status: LeadStatus
  notes: string | null
  contacted_at: string | null
  created_at: string
  updated_at: string
}

const LEAD_COLUMNS =
  'id, tenant_id, announcement_id, broker_id, name, phone, email, source, status, notes, contacted_at, created_at, updated_at'

export function useLeads(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['leads', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select(LEAD_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useLead(id: string | null | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    enabled: !!id,
    queryFn: async (): Promise<Lead> => {
      const { data, error } = await supabase.from('leads').select(LEAD_COLUMNS).eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

export type LeadInput = {
  name: string
  phone: string
  email: string
  source: LeadSource
  broker_id: string
  announcement_id: string
  notes: string
}

function toRow(input: LeadInput) {
  return {
    name: input.name,
    phone: input.phone || null,
    email: input.email || null,
    source: input.source,
    broker_id: input.broker_id || null,
    announcement_id: input.announcement_id || null,
    notes: input.notes || null,
  }
}

export function useCreateLead(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: LeadInput): Promise<Lead> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('leads')
        .insert({ tenant_id: tenantId, ...toRow(input), created_by: userData.user?.id ?? null })
        .select(LEAD_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] })
    },
  })
}

export function useUpdateLead(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      ...input
    }: { id: string; status?: LeadStatus } & LeadInput): Promise<Lead> => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('leads')
        .update({ ...toRow(input), ...(status ? { status } : {}), updated_by: userData.user?.id ?? null })
        .eq('id', id)
        .select(LEAD_COLUMNS)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] })
    },
  })
}

export function useDeleteLead(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] })
    },
  })
}

// =========================================================================
// lead_follow_ups — agenda de contato.
// =========================================================================

export type LeadFollowUp = {
  id: string
  tenant_id: string
  lead_id: string
  broker_id: string | null
  scheduled_at: string
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  result: string | null
  created_at: string
}

const FOLLOW_UP_COLUMNS =
  'id, tenant_id, lead_id, broker_id, scheduled_at, completed_at, completed_by, notes, result, created_at'

export function useLeadFollowUps(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ['lead-follow-ups', leadId],
    enabled: !!leadId,
    queryFn: async (): Promise<LeadFollowUp[]> => {
      const { data, error } = await supabase
        .from('lead_follow_ups')
        .select(FOLLOW_UP_COLUMNS)
        .eq('lead_id', leadId!)
        .order('scheduled_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

// Agenda comercial: worklist de follow-ups do tenant inteiro (não só de um
// lead), com o nome do lead embutido — replica o CommercialAgendaController
// do sistema antigo.
export type AgendaFollowUp = LeadFollowUp & { lead_name: string }

export function useAgendaFollowUps(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['agenda-follow-ups', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<AgendaFollowUp[]> => {
      const { data, error } = await supabase
        .from('lead_follow_ups')
        .select(`${FOLLOW_UP_COLUMNS}, leads!inner(name)`)
        .eq('tenant_id', tenantId!)
        .order('scheduled_at', { ascending: true })

      if (error) throw error
      return data.map(({ leads, ...row }) => ({
        ...row,
        lead_name: (leads as unknown as { name: string }).name,
      }))
    },
  })
}

export function useScheduleFollowUp(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { scheduled_at: string; notes: string; broker_id: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data: lead } = await supabase.from('leads').select('tenant_id').eq('id', leadId).single()
      const { error } = await supabase.from('lead_follow_ups').insert({
        tenant_id: lead!.tenant_id,
        lead_id: leadId,
        broker_id: input.broker_id || null,
        scheduled_at: input.scheduled_at,
        notes: input.notes || null,
        created_by: userData.user?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-follow-ups', leadId] })
      queryClient.invalidateQueries({ queryKey: ['agenda-follow-ups'] })
    },
  })
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, result }: { id: string; result: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('lead_follow_ups')
        .update({ completed_at: new Date().toISOString(), completed_by: userData.user?.id ?? null, result: result || null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead'] })
    },
  })
}

export function useRescheduleFollowUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, scheduled_at }: { id: string; scheduled_at: string }) => {
      const { error } = await supabase
        .from('lead_follow_ups')
        .update({ scheduled_at })
        .eq('id', id)
        .is('completed_at', null)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-follow-ups'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-follow-ups'] })
    },
  })
}
