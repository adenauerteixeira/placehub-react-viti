import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const BUCKET = 'sale-documents'

export type SaleStatus = 'completed' | 'cancelled'
export type InstallmentStatus = 'pending' | 'received'

export type Sale = {
  id: string
  tenant_id: string
  negotiation_id: string
  proposal_id: string | null
  announcement_id: string | null
  broker_id: string | null
  amount: number
  down_payment_amount: number
  financing_amount: number
  financing_installments: number | null
  financing_source: string | null
  payment_notes: string | null
  sold_at: string
  status: SaleStatus
  cancelled_at: string | null
  cancellation_reason: string | null
  notes: string | null
  created_at: string
}

export type SaleEntryInstallment = {
  id: string
  tenant_id: string
  sale_id: string
  number: number
  amount: number
  due_date: string
  status: InstallmentStatus
  received_at: string | null
  payment_method: string | null
  payer_name: string | null
  receipt_path: string | null
  receipt_original_name: string | null
  notes: string | null
}

export type SalePaymentAsset = {
  id: string
  tenant_id: string
  sale_id: string
  description: string
  amount: number
  notes: string | null
}

const SALE_COLUMNS =
  'id, tenant_id, negotiation_id, proposal_id, announcement_id, broker_id, amount, down_payment_amount, financing_amount, financing_installments, financing_source, payment_notes, sold_at, status, cancelled_at, cancellation_reason, notes, created_at'

export function useSales(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['sales', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Sale[]> => {
      const { data, error } = await supabase
        .from('sales')
        .select(SALE_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useSale(id: string | null | undefined) {
  return useQuery({
    queryKey: ['sale', id],
    enabled: !!id,
    queryFn: async (): Promise<Sale> => {
      const { data, error } = await supabase.from('sales').select(SALE_COLUMNS).eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

export function useSaleByNegotiation(negotiationId: string | null | undefined) {
  return useQuery({
    queryKey: ['sale-by-negotiation', negotiationId],
    enabled: !!negotiationId,
    queryFn: async (): Promise<Sale | null> => {
      const { data, error } = await supabase
        .from('sales')
        .select(SALE_COLUMNS)
        .eq('negotiation_id', negotiationId!)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

export function useSaleInstallments(saleId: string | null | undefined) {
  return useQuery({
    queryKey: ['sale-installments', saleId],
    enabled: !!saleId,
    queryFn: async (): Promise<SaleEntryInstallment[]> => {
      const { data, error } = await supabase
        .from('sale_entry_installments')
        .select(
          'id, tenant_id, sale_id, number, amount, due_date, status, received_at, payment_method, payer_name, receipt_path, receipt_original_name, notes',
        )
        .eq('sale_id', saleId!)
        .order('number')

      if (error) throw error
      return data
    },
  })
}

export function useSalePaymentAssets(saleId: string | null | undefined) {
  return useQuery({
    queryKey: ['sale-payment-assets', saleId],
    enabled: !!saleId,
    queryFn: async (): Promise<SalePaymentAsset[]> => {
      const { data, error } = await supabase
        .from('sale_payment_assets')
        .select('id, tenant_id, sale_id, description, amount, notes')
        .eq('sale_id', saleId!)

      if (error) throw error
      return data
    },
  })
}

export async function receiptSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10)
  return data?.signedUrl ?? null
}

export type EntryInstallmentDraft = { number: number; amount: number; due_date: string }
export type PaymentAssetDraft = { description: string; amount: number; notes: string }

export type CreateSaleInput = {
  proposal_id: string
  down_payment_amount: number
  entry_installments: EntryInstallmentDraft[]
  payment_assets: PaymentAssetDraft[]
  financing_installments: number | null
  financing_source: string
  payment_notes: string
  notes: string
  reservation_id: string | null
  commission_percentage: number
}

export function useCreateSaleFromProposal(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSaleInput): Promise<Sale> => {
      const { data, error } = await supabase.rpc('create_sale_from_proposal', {
        p_proposal_id: input.proposal_id,
        p_down_payment_amount: input.down_payment_amount,
        p_entry_installments: input.entry_installments,
        p_payment_assets: input.payment_assets.map((a) => ({ ...a, notes: a.notes || null })),
        p_financing_installments: input.financing_installments,
        p_financing_source: input.financing_source || null,
        p_payment_notes: input.payment_notes || null,
        p_notes: input.notes || null,
        p_reservation_id: input.reservation_id,
        p_commission_percentage: input.commission_percentage,
      })

      if (error) throw error
      return data
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['sale-by-negotiation', sale.negotiation_id] })
      queryClient.invalidateQueries({ queryKey: ['negotiation', sale.negotiation_id] })
      queryClient.invalidateQueries({ queryKey: ['negotiations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reservations', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['commissions', tenantId] })
    },
  })
}

export function useCancelSale(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<Sale> => {
      const { data, error } = await supabase.rpc('cancel_sale', { p_id: id, p_reason: reason || null })
      if (error) throw error
      return data
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['sale', sale.id] })
      queryClient.invalidateQueries({ queryKey: ['negotiation', sale.negotiation_id] })
      queryClient.invalidateQueries({ queryKey: ['announcements', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['commissions', tenantId] })
    },
  })
}

export function useReceiveInstallment(saleId: string, tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payment_method,
      payer_name,
      receiptFile,
    }: {
      id: string
      payment_method: string
      payer_name: string
      receiptFile: File | null
    }): Promise<SaleEntryInstallment> => {
      let receiptPath: string | null = null
      let receiptOriginalName: string | null = null

      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop()
        receiptPath = `${tenantId}/sales/${saleId}/${id}-${Date.now()}.${ext}`
        receiptOriginalName = receiptFile.name
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(receiptPath, receiptFile)
        if (uploadError) throw uploadError
      }

      const { data, error } = await supabase.rpc('receive_installment', {
        p_id: id,
        p_payment_method: payment_method || null,
        p_payer_name: payer_name || null,
        p_receipt_path: receiptPath,
        p_receipt_original_name: receiptOriginalName,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-installments', saleId] })
      queryClient.invalidateQueries({ queryKey: ['commissions', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['commission-by-sale', saleId] })
    },
  })
}

export type AuditLog = {
  id: string
  tenant_id: string
  sale_id: string
  event_type: string
  title: string
  description: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  user_id: string | null
  created_at: string
}

export function useSaleAuditLogs(saleId: string | null | undefined) {
  return useQuery({
    queryKey: ['audit-logs', saleId],
    enabled: !!saleId,
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, tenant_id, sale_id, event_type, title, description, old_values, new_values, user_id, created_at')
        .eq('sale_id', saleId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}
