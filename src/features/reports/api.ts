import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CommissionStatus } from '@/features/commissions/api'
import type { LeadSource, LeadStatus } from '@/features/leads/api'
import type { InstallmentStatus, SaleStatus } from '@/features/sales/api'

export type ReportType = 'sales' | 'commissions' | 'receipts' | 'brokers' | 'leads'

export type SummaryItem = { label: string; value: number; format: 'count' | 'money' }

export type SaleReportRow = {
  id: string
  sold_at: string
  status: SaleStatus
  amount: number
  brokerName: string
  clientName: string
  announcementTitle: string
}

export type CommissionReportRow = {
  id: string
  sale_id: string
  sold_at: string | null
  status: CommissionStatus
  gross_amount: number
  broker_amount: number
  agency_amount: number
  brokerName: string
  clientName: string
}

export type ReceiptReportRow = {
  id: string
  saleId: string
  due_date: string
  number: number
  status: InstallmentStatus
  amount: number
  received_at: string | null
  brokerName: string
  clientName: string
}

export type BrokerReportRow = {
  broker_id: string
  name: string
  creci: string
  leadsCount: number
  convertedLeads: number
  salesCount: number
  salesAmount: number
  commissionAmount: number
}

export type LeadReportRow = {
  id: string
  created_at: string
  name: string
  phone: string | null
  email: string | null
  source: LeadSource
  status: LeadStatus
  brokerName: string
  announcementTitle: string
}

export type ReportResult =
  | { type: 'sales'; rows: SaleReportRow[]; summary: SummaryItem[] }
  | { type: 'commissions'; rows: CommissionReportRow[]; summary: SummaryItem[] }
  | { type: 'receipts'; rows: ReceiptReportRow[]; summary: SummaryItem[] }
  | { type: 'brokers'; rows: BrokerReportRow[]; summary: SummaryItem[] }
  | { type: 'leads'; rows: LeadReportRow[]; summary: SummaryItem[] }

export type ReportFilters = {
  type: ReportType
  startDate: string
  endDate: string
  brokerId: string | null
  status: string | null
}

async function brokerNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from('brokers').select('id, name').in('id', ids)
  if (error) throw error
  return new Map(data.map((b) => [b.id, b.name]))
}

async function announcementTitles(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from('announcements').select('id, title').in('id', ids)
  if (error) throw error
  return new Map(data.map((a) => [a.id, a.title]))
}

async function leadNamesByNegotiation(negotiationIds: string[]): Promise<Map<string, string>> {
  if (negotiationIds.length === 0) return new Map()
  const { data: negotiations, error } = await supabase
    .from('negotiations')
    .select('id, lead_id')
    .in('id', negotiationIds)
  if (error) throw error

  const leadIds = [...new Set(negotiations.map((n) => n.lead_id))]
  if (leadIds.length === 0) return new Map()
  const { data: leads, error: leadsError } = await supabase.from('leads').select('id, name').in('id', leadIds)
  if (leadsError) throw leadsError

  const leadNameById = new Map(leads.map((l) => [l.id, l.name]))
  return new Map(negotiations.map((n) => [n.id, leadNameById.get(n.lead_id) ?? '—']))
}

async function fetchSalesReport(
  tenantId: string,
  startDate: string,
  endDate: string,
  brokerId: string | null,
  status: SaleStatus | null,
): Promise<{ rows: SaleReportRow[]; summary: SummaryItem[] }> {
  let query = supabase
    .from('sales')
    .select('id, sold_at, status, amount, broker_id, announcement_id, negotiation_id')
    .eq('tenant_id', tenantId)
    .gte('sold_at', startDate)
    .lte('sold_at', endDate)
  if (brokerId) query = query.eq('broker_id', brokerId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('sold_at', { ascending: false })
  if (error) throw error

  const [leadNames, brokers, announcements] = await Promise.all([
    leadNamesByNegotiation([...new Set(data.map((s) => s.negotiation_id))]),
    brokerNames([...new Set(data.map((s) => s.broker_id).filter((v): v is string => !!v))]),
    announcementTitles([...new Set(data.map((s) => s.announcement_id).filter((v): v is string => !!v))]),
  ])

  const rows: SaleReportRow[] = data.map((s) => ({
    id: s.id,
    sold_at: s.sold_at,
    status: s.status,
    amount: s.amount,
    brokerName: s.broker_id ? (brokers.get(s.broker_id) ?? '—') : '—',
    clientName: leadNames.get(s.negotiation_id) ?? '—',
    announcementTitle: s.announcement_id ? (announcements.get(s.announcement_id) ?? '—') : '—',
  }))

  const completed = rows.filter((r) => r.status === 'completed')
  return {
    rows,
    summary: [
      { label: 'Registros', value: rows.length, format: 'count' },
      { label: 'Vendas válidas', value: completed.length, format: 'count' },
      { label: 'Valor vendido', value: completed.reduce((sum, r) => sum + r.amount, 0), format: 'money' },
    ],
  }
}

async function fetchCommissionsReport(
  tenantId: string,
  startDate: string,
  endDate: string,
  brokerId: string | null,
  status: CommissionStatus | null,
): Promise<{ rows: CommissionReportRow[]; summary: SummaryItem[] }> {
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('id, sold_at, negotiation_id')
    .eq('tenant_id', tenantId)
    .gte('sold_at', startDate)
    .lte('sold_at', endDate)
  if (salesError) throw salesError

  const saleIds = sales.map((s) => s.id)
  let commissionRows: {
    id: string
    sale_id: string
    broker_id: string | null
    status: CommissionStatus
    gross_amount: number
    broker_amount: number
    agency_amount: number
  }[] = []

  if (saleIds.length > 0) {
    let query = supabase
      .from('commissions')
      .select('id, sale_id, broker_id, status, gross_amount, broker_amount, agency_amount')
      .eq('tenant_id', tenantId)
      .in('sale_id', saleIds)
    if (brokerId) query = query.eq('broker_id', brokerId)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    commissionRows = data
  }

  const saleById = new Map(sales.map((s) => [s.id, s]))
  const [leadNames, brokers] = await Promise.all([
    leadNamesByNegotiation([...new Set(sales.map((s) => s.negotiation_id))]),
    brokerNames([...new Set(commissionRows.map((c) => c.broker_id).filter((v): v is string => !!v))]),
  ])

  const rows: CommissionReportRow[] = commissionRows
    .map((c) => {
      const sale = saleById.get(c.sale_id)
      return {
        id: c.id,
        sale_id: c.sale_id,
        sold_at: sale?.sold_at ?? null,
        status: c.status,
        gross_amount: c.gross_amount,
        broker_amount: c.broker_amount,
        agency_amount: c.agency_amount,
        brokerName: c.broker_id ? (brokers.get(c.broker_id) ?? '—') : '—',
        clientName: sale ? (leadNames.get(sale.negotiation_id) ?? '—') : '—',
      }
    })
    .sort((a, b) => (b.sold_at ?? '').localeCompare(a.sold_at ?? ''))

  const valid = rows.filter((r) => r.status !== 'cancelled')
  return {
    rows,
    summary: [
      { label: 'Registros', value: rows.length, format: 'count' },
      { label: 'Comissões válidas', value: valid.length, format: 'count' },
      { label: 'Comissão bruta', value: valid.reduce((sum, r) => sum + r.gross_amount, 0), format: 'money' },
      { label: 'Corretor', value: valid.reduce((sum, r) => sum + r.broker_amount, 0), format: 'money' },
    ],
  }
}

async function fetchReceiptsReport(
  tenantId: string,
  startDate: string,
  endDate: string,
  brokerId: string | null,
  status: InstallmentStatus | null,
): Promise<{ rows: ReceiptReportRow[]; summary: SummaryItem[] }> {
  let query = supabase
    .from('sale_entry_installments')
    .select('id, sale_id, number, amount, due_date, status, received_at')
    .eq('tenant_id', tenantId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('due_date')
  if (error) throw error

  const saleIds = [...new Set(data.map((i) => i.sale_id))]
  const { data: sales, error: salesError } =
    saleIds.length > 0
      ? await supabase.from('sales').select('id, broker_id, negotiation_id').in('id', saleIds)
      : { data: [] as { id: string; broker_id: string | null; negotiation_id: string }[], error: null }
  if (salesError) throw salesError
  const saleById = new Map(sales.map((s) => [s.id, s]))

  const filtered = brokerId ? data.filter((i) => saleById.get(i.sale_id)?.broker_id === brokerId) : data

  const [leadNames, brokers] = await Promise.all([
    leadNamesByNegotiation([...new Set(sales.map((s) => s.negotiation_id))]),
    brokerNames([...new Set(sales.map((s) => s.broker_id).filter((v): v is string => !!v))]),
  ])

  const rows: ReceiptReportRow[] = filtered.map((i) => {
    const sale = saleById.get(i.sale_id)
    return {
      id: i.id,
      saleId: i.sale_id,
      due_date: i.due_date,
      number: i.number,
      status: i.status,
      amount: i.amount,
      received_at: i.received_at,
      brokerName: sale?.broker_id ? (brokers.get(sale.broker_id) ?? '—') : '—',
      clientName: sale ? (leadNames.get(sale.negotiation_id) ?? '—') : '—',
    }
  })

  return {
    rows,
    summary: [
      { label: 'Parcelas', value: rows.length, format: 'count' },
      { label: 'Previsto', value: rows.reduce((sum, r) => sum + r.amount, 0), format: 'money' },
      {
        label: 'Recebido',
        value: rows.filter((r) => r.received_at).reduce((sum, r) => sum + r.amount, 0),
        format: 'money',
      },
    ],
  }
}

async function fetchBrokersReport(
  tenantId: string,
  startDate: string,
  endDate: string,
  startIso: string,
  endIso: string,
  brokerId: string | null,
): Promise<{ rows: BrokerReportRow[]; summary: SummaryItem[] }> {
  let brokerQuery = supabase.from('brokers').select('id, name, creci, creci_state').eq('tenant_id', tenantId).order('name')
  if (brokerId) brokerQuery = brokerQuery.eq('id', brokerId)
  const { data: brokers, error: brokersError } = await brokerQuery
  if (brokersError) throw brokersError

  const [salesRes, leadsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('id, broker_id, amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('sold_at', startDate)
      .lte('sold_at', endDate),
    supabase
      .from('leads')
      .select('id, broker_id, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', startIso)
      .lte('created_at', endIso),
  ])
  if (salesRes.error) throw salesRes.error
  if (leadsRes.error) throw leadsRes.error

  const saleIds = salesRes.data.map((s) => s.id)
  const commissionsRes =
    saleIds.length > 0
      ? await supabase
          .from('commissions')
          .select('broker_id, broker_amount, status')
          .eq('tenant_id', tenantId)
          .in('sale_id', saleIds)
          .neq('status', 'cancelled')
      : { data: [] as { broker_id: string | null; broker_amount: number }[], error: null }
  if (commissionsRes.error) throw commissionsRes.error

  const rows: BrokerReportRow[] = brokers.map((b) => {
    const brokerSales = salesRes.data.filter((s) => s.broker_id === b.id)
    const brokerLeads = leadsRes.data.filter((l) => l.broker_id === b.id)
    const commissionAmount = commissionsRes.data
      .filter((c) => c.broker_id === b.id)
      .reduce((sum, c) => sum + c.broker_amount, 0)

    return {
      broker_id: b.id,
      name: b.name,
      creci: b.creci ? `${b.creci}${b.creci_state ? `/${b.creci_state}` : ''}` : '—',
      leadsCount: brokerLeads.length,
      convertedLeads: brokerLeads.filter((l) => l.status === 'converted').length,
      salesCount: brokerSales.length,
      salesAmount: brokerSales.reduce((sum, s) => sum + s.amount, 0),
      commissionAmount,
    }
  })

  return {
    rows,
    summary: [
      { label: 'Corretores', value: rows.length, format: 'count' },
      { label: 'Vendas', value: rows.reduce((sum, r) => sum + r.salesCount, 0), format: 'count' },
      { label: 'Valor vendido', value: rows.reduce((sum, r) => sum + r.salesAmount, 0), format: 'money' },
    ],
  }
}

async function fetchLeadsReport(
  tenantId: string,
  startIso: string,
  endIso: string,
  brokerId: string | null,
  status: LeadStatus | null,
): Promise<{ rows: LeadReportRow[]; summary: SummaryItem[] }> {
  let query = supabase
    .from('leads')
    .select('id, name, phone, email, source, status, broker_id, announcement_id, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
  if (brokerId) query = query.eq('broker_id', brokerId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error

  const [brokers, announcements] = await Promise.all([
    brokerNames([...new Set(data.map((l) => l.broker_id).filter((v): v is string => !!v))]),
    announcementTitles([...new Set(data.map((l) => l.announcement_id).filter((v): v is string => !!v))]),
  ])

  const rows: LeadReportRow[] = data.map((l) => ({
    id: l.id,
    created_at: l.created_at,
    name: l.name,
    phone: l.phone,
    email: l.email,
    source: l.source,
    status: l.status,
    brokerName: l.broker_id ? (brokers.get(l.broker_id) ?? '—') : '—',
    announcementTitle: l.announcement_id ? (announcements.get(l.announcement_id) ?? '—') : '—',
  }))

  return {
    rows,
    summary: [
      { label: 'Leads', value: rows.length, format: 'count' },
      { label: 'Convertidos', value: rows.filter((r) => r.status === 'converted').length, format: 'count' },
    ],
  }
}

export function useReportData(tenantId: string | null | undefined, filters: ReportFilters) {
  return useQuery({
    queryKey: ['report', tenantId, filters.type, filters.startDate, filters.endDate, filters.brokerId, filters.status],
    enabled: !!tenantId && !!filters.startDate && !!filters.endDate,
    queryFn: async (): Promise<ReportResult> => {
      const startIso = new Date(`${filters.startDate}T00:00:00`).toISOString()
      const endIso = new Date(`${filters.endDate}T23:59:59.999`).toISOString()

      switch (filters.type) {
        case 'commissions':
          return {
            type: 'commissions',
            ...(await fetchCommissionsReport(
              tenantId!,
              filters.startDate,
              filters.endDate,
              filters.brokerId,
              filters.status as CommissionStatus | null,
            )),
          }
        case 'receipts':
          return {
            type: 'receipts',
            ...(await fetchReceiptsReport(
              tenantId!,
              filters.startDate,
              filters.endDate,
              filters.brokerId,
              filters.status as InstallmentStatus | null,
            )),
          }
        case 'brokers':
          return {
            type: 'brokers',
            ...(await fetchBrokersReport(tenantId!, filters.startDate, filters.endDate, startIso, endIso, filters.brokerId)),
          }
        case 'leads':
          return {
            type: 'leads',
            ...(await fetchLeadsReport(tenantId!, startIso, endIso, filters.brokerId, filters.status as LeadStatus | null)),
          }
        default:
          return {
            type: 'sales',
            ...(await fetchSalesReport(
              tenantId!,
              filters.startDate,
              filters.endDate,
              filters.brokerId,
              filters.status as SaleStatus | null,
            )),
          }
      }
    },
  })
}
