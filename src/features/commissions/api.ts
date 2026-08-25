import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const BUCKET = 'sale-documents'

export type CommissionStatus = 'expected' | 'receivable' | 'received' | 'paid' | 'cancelled'
export type CommissionInstallmentStatus = 'pending' | 'received' | 'awaiting_confirmation' | 'paid'

export type Commission = {
  id: string
  tenant_id: string
  sale_id: string
  broker_id: string | null
  percentage: number
  broker_percentage: number
  agency_percentage: number
  gross_amount: number
  deductions: number
  net_amount: number
  broker_amount: number
  agency_amount: number
  status: CommissionStatus
  received_at: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
}

export type CommissionInstallment = {
  id: string
  tenant_id: string
  commission_id: string
  sale_entry_installment_id: string
  number: number
  due_date: string
  gross_amount: number
  broker_amount: number
  agency_amount: number
  status: CommissionInstallmentStatus
  received_at: string | null
  broker_paid_at: string | null
  broker_paid_by: string | null
  broker_payment_method: string | null
  broker_receipt_path: string | null
  broker_receipt_original_name: string | null
  broker_payment_notes: string | null
  broker_confirmed_at: string | null
  broker_confirmed_by: string | null
}

const COMMISSION_COLUMNS =
  'id, tenant_id, sale_id, broker_id, percentage, broker_percentage, agency_percentage, gross_amount, deductions, net_amount, broker_amount, agency_amount, status, received_at, paid_at, notes, created_at'

const INSTALLMENT_COLUMNS =
  'id, tenant_id, commission_id, sale_entry_installment_id, number, due_date, gross_amount, broker_amount, agency_amount, status, received_at, broker_paid_at, broker_paid_by, broker_payment_method, broker_receipt_path, broker_receipt_original_name, broker_payment_notes, broker_confirmed_at, broker_confirmed_by'

export function useCommissions(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['commissions', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Commission[]> => {
      const { data, error } = await supabase
        .from('commissions')
        .select(COMMISSION_COLUMNS)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useCommission(id: string | null | undefined) {
  return useQuery({
    queryKey: ['commission', id],
    enabled: !!id,
    queryFn: async (): Promise<Commission> => {
      const { data, error } = await supabase.from('commissions').select(COMMISSION_COLUMNS).eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

export function useCommissionBySale(saleId: string | null | undefined) {
  return useQuery({
    queryKey: ['commission-by-sale', saleId],
    enabled: !!saleId,
    queryFn: async (): Promise<Commission | null> => {
      const { data, error } = await supabase
        .from('commissions')
        .select(COMMISSION_COLUMNS)
        .eq('sale_id', saleId!)
        .maybeSingle()

      if (error) throw error
      return data
    },
  })
}

export function useCommissionInstallments(commissionId: string | null | undefined) {
  return useQuery({
    queryKey: ['commission-installments', commissionId],
    enabled: !!commissionId,
    queryFn: async (): Promise<CommissionInstallment[]> => {
      const { data, error } = await supabase
        .from('commission_installments')
        .select(INSTALLMENT_COLUMNS)
        .eq('commission_id', commissionId!)
        .order('number')

      if (error) throw error
      return data
    },
  })
}

export function useRegisterBrokerPayment(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      commission_id,
      paid_at,
      payment_method,
      payment_notes,
      receiptFile,
    }: {
      id: string
      commission_id: string
      paid_at: string
      payment_method: string
      payment_notes: string
      receiptFile: File | null
    }): Promise<CommissionInstallment> => {
      let receiptPath: string | null = null
      let receiptOriginalName: string | null = null

      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop()
        receiptPath = `${tenantId}/commissions/${commission_id}/${id}-${Date.now()}.${ext}`
        receiptOriginalName = receiptFile.name
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(receiptPath, receiptFile)
        if (uploadError) throw uploadError
      }

      const { data, error } = await supabase.rpc('register_broker_commission_payment', {
        p_installment_id: id,
        p_paid_at: paid_at,
        p_payment_method: payment_method || null,
        p_receipt_path: receiptPath,
        p_receipt_original_name: receiptOriginalName,
        p_payment_notes: payment_notes || null,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commission-installments', variables.commission_id] })
      queryClient.invalidateQueries({ queryKey: ['commission', variables.commission_id] })
      queryClient.invalidateQueries({ queryKey: ['commissions', tenantId] })
    },
  })
}

export function useConfirmBrokerReceipt(commissionId: string, tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (installmentId: string): Promise<CommissionInstallment> => {
      const { data, error } = await supabase.rpc('confirm_broker_commission_receipt', {
        p_installment_id: installmentId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-installments', commissionId] })
      queryClient.invalidateQueries({ queryKey: ['commission', commissionId] })
      queryClient.invalidateQueries({ queryKey: ['commissions', tenantId] })
    },
  })
}
