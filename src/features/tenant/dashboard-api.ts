import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type PeriodKey = 'current_month' | 'previous_month' | 'current_year' | 'custom'

export type Period = {
  key: PeriodKey
  label: string
  start: Date
  end: Date
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0, 23, 59, 59, 999)
}

export function resolvePeriod(key: PeriodKey, customFrom?: string, customTo?: string): Period {
  const now = new Date()

  if (key === 'previous_month') {
    const refMonth = now.getMonth() - 1
    const year = now.getFullYear() + Math.floor(refMonth / 12)
    const month = ((refMonth % 12) + 12) % 12
    return { key, label: 'Mês anterior', start: new Date(year, month, 1), end: endOfMonth(year, month) }
  }

  if (key === 'current_year') {
    return {
      key,
      label: 'Ano atual',
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    }
  }

  if (key === 'custom' && customFrom && customTo) {
    let start = new Date(`${customFrom}T00:00:00`)
    let end = new Date(`${customTo}T23:59:59.999`)
    if (start > end) [start, end] = [end, start]
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR')
    return { key, label: `${fmt(start)} a ${fmt(end)}`, start, end }
  }

  return {
    key: 'current_month',
    label: 'Mês atual',
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: endOfMonth(now.getFullYear(), now.getMonth()),
  }
}

export type CommercialMetrics = {
  totalLeads: number
  activeLeads: number
  convertedLeads: number
  activeNegotiations: number
  openProposals: number
  totalProposals: number
  acceptedProposals: number
  salesCount: number
  salesAmount: number
  commissionGross: number
  commissionBroker: number
  commissionAgency: number
  leadConversion: number
  proposalConversion: number
}

export function useDashboardCommercialMetrics(tenantId: string | null | undefined, period: Period) {
  const startIso = period.start.toISOString()
  const endIso = period.end.toISOString()
  const startDate = period.start.toISOString().slice(0, 10)
  const endDate = period.end.toISOString().slice(0, 10)

  return useQuery({
    queryKey: ['dashboard-commercial', tenantId, startIso, endIso],
    enabled: !!tenantId,
    queryFn: async (): Promise<CommercialMetrics> => {
      const [leadsRes, negotiationsRes, proposalsRes, salesRes] = await Promise.all([
        supabase.from('leads').select('id, status').eq('tenant_id', tenantId!).gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('negotiations').select('id, status').eq('tenant_id', tenantId!).gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('proposals').select('id, status').eq('tenant_id', tenantId!).gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('sales').select('id, amount').eq('tenant_id', tenantId!).eq('status', 'completed').gte('sold_at', startDate).lte('sold_at', endDate),
      ])
      if (leadsRes.error) throw leadsRes.error
      if (negotiationsRes.error) throw negotiationsRes.error
      if (proposalsRes.error) throw proposalsRes.error
      if (salesRes.error) throw salesRes.error

      const saleIds = salesRes.data.map((s) => s.id)
      const commissionsRes =
        saleIds.length > 0
          ? await supabase
              .from('commissions')
              .select('gross_amount, broker_amount, agency_amount, status')
              .eq('tenant_id', tenantId!)
              .in('sale_id', saleIds)
              .neq('status', 'cancelled')
          : { data: [] as { gross_amount: number; broker_amount: number; agency_amount: number }[], error: null }
      if (commissionsRes.error) throw commissionsRes.error

      const totalLeads = leadsRes.data.length
      const convertedLeads = leadsRes.data.filter((l) => l.status === 'converted').length
      const activeLeads = leadsRes.data.filter((l) => !['converted', 'lost'].includes(l.status)).length
      const activeNegotiations = negotiationsRes.data.filter((n) => !['won', 'lost'].includes(n.status)).length
      const totalProposals = proposalsRes.data.length
      const openProposals = proposalsRes.data.filter((p) => ['draft', 'sent', 'countered'].includes(p.status)).length
      const acceptedProposals = proposalsRes.data.filter((p) => p.status === 'accepted').length
      const salesAmount = salesRes.data.reduce((sum, s) => sum + s.amount, 0)

      return {
        totalLeads,
        activeLeads,
        convertedLeads,
        activeNegotiations,
        openProposals,
        totalProposals,
        acceptedProposals,
        salesCount: salesRes.data.length,
        salesAmount,
        commissionGross: commissionsRes.data.reduce((sum, c) => sum + c.gross_amount, 0),
        commissionBroker: commissionsRes.data.reduce((sum, c) => sum + c.broker_amount, 0),
        commissionAgency: commissionsRes.data.reduce((sum, c) => sum + c.agency_amount, 0),
        leadConversion: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0,
        proposalConversion: totalProposals > 0 ? Math.round((acceptedProposals / totalProposals) * 1000) / 10 : 0,
      }
    },
  })
}

export type UpcomingContact = {
  id: string
  lead_id: string
  announcement_id: string | null
  broker_id: string | null
  next_contact_at: string
}

export function useUpcomingContacts(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['dashboard-upcoming-contacts', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const limit = new Date()
      limit.setDate(limit.getDate() + 7)
      limit.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('negotiations')
        .select('id, lead_id, announcement_id, broker_id, next_contact_at')
        .eq('tenant_id', tenantId!)
        .not('next_contact_at', 'is', null)
        .not('status', 'in', '(won,lost)')
        .lte('next_contact_at', limit.toISOString())
        .order('next_contact_at')

      if (error) throw error

      const now = new Date()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const items = data as UpcomingContact[]
      return {
        overdue: items.filter((i) => new Date(i.next_contact_at) < now),
        today: items.filter((i) => {
          const d = new Date(i.next_contact_at)
          return d >= todayStart && d <= todayEnd && d >= now
        }),
        upcoming: items.filter((i) => new Date(i.next_contact_at) > todayEnd),
      }
    },
  })
}

export type RecentActivity = {
  when: string
  title: string
  description: string
  route: string
}

export function useRecentActivity(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['dashboard-recent-activity', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<RecentActivity[]> => {
      const [leadsRes, negotiationsRes, salesRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id, name, status, updated_at')
          .eq('tenant_id', tenantId!)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('negotiations')
          .select('id, status, updated_at')
          .eq('tenant_id', tenantId!)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('sales')
          .select('id, amount, status, updated_at')
          .eq('tenant_id', tenantId!)
          .order('updated_at', { ascending: false })
          .limit(5),
      ])
      if (leadsRes.error) throw leadsRes.error
      if (negotiationsRes.error) throw negotiationsRes.error
      if (salesRes.error) throw salesRes.error

      const activities: RecentActivity[] = [
        ...leadsRes.data.map((l) => ({
          when: l.updated_at,
          title: l.name,
          description: `Lead atualizado · ${l.status}`,
          route: `/leads/${l.id}`,
        })),
        ...negotiationsRes.data.map((n) => ({
          when: n.updated_at,
          title: 'Negociação',
          description: `Status: ${n.status}`,
          route: `/negotiations/${n.id}`,
        })),
        ...salesRes.data.map((s) => ({
          when: s.updated_at,
          title: 'Venda',
          description: `${s.status} · ${s.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          route: `/sales/${s.id}`,
        })),
      ]

      return activities.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 10)
    },
  })
}

export type BrokerRankingRow = {
  broker_id: string
  name: string
  salesCount: number
  salesAmount: number
}

export function useBrokerRanking(tenantId: string | null | undefined, period: Period) {
  const startDate = period.start.toISOString().slice(0, 10)
  const endDate = period.end.toISOString().slice(0, 10)

  return useQuery({
    queryKey: ['dashboard-broker-ranking', tenantId, startDate, endDate],
    enabled: !!tenantId,
    queryFn: async (): Promise<BrokerRankingRow[]> => {
      const [brokersRes, salesRes] = await Promise.all([
        supabase.from('brokers').select('id, name').eq('tenant_id', tenantId!).eq('active', true).order('name'),
        supabase
          .from('sales')
          .select('broker_id, amount')
          .eq('tenant_id', tenantId!)
          .eq('status', 'completed')
          .gte('sold_at', startDate)
          .lte('sold_at', endDate),
      ])
      if (brokersRes.error) throw brokersRes.error
      if (salesRes.error) throw salesRes.error

      return brokersRes.data
        .map((broker) => {
          const sales = salesRes.data.filter((s) => s.broker_id === broker.id)
          return {
            broker_id: broker.id,
            name: broker.name,
            salesCount: sales.length,
            salesAmount: sales.reduce((sum, s) => sum + s.amount, 0),
          }
        })
        .sort((a, b) => b.salesAmount - a.salesAmount)
        .slice(0, 10)
    },
  })
}
