import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Banknote,
  Building2,
  Coins,
  Handshake,
  Percent,
  ReceiptText,
  Target,
  UserCheck,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatTile } from '@/components/stat-tile'
import { useAnnouncements } from '@/features/announcements/api'
import { hasPermission, type Profile } from '@/features/auth/use-profile'
import { useDevelopments } from '@/features/developments/api'
import { useLeads } from '@/features/leads/api'
import { usePartners } from '@/features/partners/api'
import { useTenantUsers } from '@/features/tenant-users/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import {
  resolvePeriod,
  useBrokerRanking,
  useDashboardCommercialMetrics,
  useRecentActivity,
  useUpcomingContacts,
  type CommercialMetrics,
  type PeriodKey,
} from './dashboard-api'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'current_month', label: 'Mês atual' },
  { key: 'previous_month', label: 'Mês anterior' },
  { key: 'current_year', label: 'Ano atual' },
  { key: 'custom', label: 'Personalizado' },
]

const FUNNEL_STAGE_COLORS = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)']

export function TenantDashboardPage() {
  const { tenant, profile } = useTenantOutletContext()
  const isBroker = profile.role === 'broker'

  const [periodKey, setPeriodKey] = useState<PeriodKey>('current_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const period = resolvePeriod(periodKey, customFrom, customTo)

  const { data: metrics, isLoading: metricsLoading } = useDashboardCommercialMetrics(tenant.id, period)
  const { data: contacts } = useUpcomingContacts(tenant.id)
  const { data: activities } = useRecentActivity(tenant.id)
  const { data: ranking } = useBrokerRanking(tenant.id, period)
  const { data: leads } = useLeads(tenant.id)

  const leadName = (id: string) => leads?.find((l) => l.id === id)?.name ?? 'Lead'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          Bem-vindo{profile.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={periodKey === opt.key ? 'default' : 'outline'}
              onClick={() => setPeriodKey(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
          {periodKey === 'custom' && (
            <>
              <Input type="date" className="w-36" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input type="date" className="w-36" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
        </div>
      </div>
      <p className="text-muted-foreground text-sm">Período: {period.label}</p>

      {metricsLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {metrics && (isBroker ? <BrokerOverview metrics={metrics} /> : <ManagementOverview metrics={metrics} tenantId={tenant.id} profile={profile} />)}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos contatos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(['overdue', 'today', 'upcoming'] as const).map((group) => {
              const label = { overdue: 'Atrasados', today: 'Hoje', upcoming: 'Em breve' }[group]
              const variant = group === 'overdue' ? 'destructive' : group === 'today' ? 'default' : 'outline'
              const items = contacts?.[group] ?? []
              if (items.length === 0) return null
              return (
                <div key={group} className="flex flex-col gap-1.5">
                  <Badge variant={variant} className="w-fit">
                    {label} ({items.length})
                  </Badge>
                  {items.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      to={`/negotiations/${item.id}`}
                      className="hover:bg-accent flex items-center justify-between rounded-lg px-2 py-1 text-sm"
                    >
                      <span>{leadName(item.lead_id)}</span>
                      <span className="text-muted-foreground text-xs">{formatDateTime(item.next_contact_at)}</span>
                    </Link>
                  ))}
                </div>
              )
            })}
            {contacts && contacts.overdue.length === 0 && contacts.today.length === 0 && contacts.upcoming.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum contato agendado pros próximos dias.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!activities || activities.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma atividade recente.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {activities.map((activity, idx) => (
                  <li key={idx}>
                    <Link to={activity.route} className="hover:bg-accent flex flex-col rounded-lg px-2 py-1">
                      <span className="text-sm font-medium">{activity.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {activity.description} · {formatDateTime(activity.when)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {!isBroker && ranking && ranking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ranking de corretores</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.every((r) => r.salesAmount === 0) ? (
              <p className="text-muted-foreground text-sm">Nenhuma venda no período.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatPrice(v)} fontSize={12} />
                    <YAxis type="category" dataKey="name" width={140} fontSize={12} />
                    <Tooltip formatter={(v) => formatPrice(Number(v))} />
                    <Bar dataKey="salesAmount" fill="var(--color-chart-1)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BrokerOverview({ metrics }: { metrics: CommercialMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatTile label="Leads" value={metrics.totalLeads} icon={Users} accent="chart-1" hint={`${metrics.leadConversion}% convertidos`} />
      <StatTile label="Negociações ativas" value={metrics.activeNegotiations} icon={Handshake} accent="chart-2" />
      <StatTile
        label="Propostas"
        value={metrics.totalProposals}
        icon={ReceiptText}
        accent="chart-3"
        hint={`${metrics.proposalConversion}% aceitas`}
      />
      <StatTile label="Vendas" value={metrics.salesCount} icon={Building2} accent="chart-4" hint={formatPrice(metrics.salesAmount)} />
      <StatTile label="Sua comissão" value={metrics.commissionBroker} format="money" icon={Coins} accent="chart-5" />
    </div>
  )
}

function ManagementOverview({
  metrics,
  tenantId,
  profile,
}: {
  metrics: CommercialMetrics
  tenantId: string
  profile: Profile
}) {
  const { data: announcements } = useAnnouncements(hasPermission(profile, 'announcements') ? tenantId : null)
  const { data: developments } = useDevelopments(hasPermission(profile, 'developments') ? tenantId : null)
  const { data: partners } = usePartners(hasPermission(profile, 'partners') ? tenantId : null)
  const { data: users } = useTenantUsers(hasPermission(profile, 'users') ? tenantId : null)

  const ticketMedio = metrics.salesCount > 0 ? metrics.salesAmount / metrics.salesCount : 0

  const funnelData = [
    { stage: 'Leads', count: metrics.totalLeads },
    { stage: 'Negociações', count: metrics.totalNegotiations },
    { stage: 'Propostas', count: metrics.totalProposals },
    { stage: 'Vendas', count: metrics.salesCount },
  ]
  const hasFunnelData = funnelData.some((s) => s.count > 0)

  const catalogTiles = [
    hasPermission(profile, 'announcements') && { title: 'Anúncios', count: announcements?.length, to: '/announcements', icon: Building2 },
    hasPermission(profile, 'developments') && { title: 'Empreendimentos', count: developments?.length, to: '/developments', icon: Target },
    hasPermission(profile, 'partners') && { title: 'Parceiros', count: partners?.length, to: '/partners', icon: Handshake },
    hasPermission(profile, 'users') && {
      title: 'Usuários ativos',
      count: users?.filter((u) => u.is_active).length,
      to: '/users',
      icon: UserCheck,
    },
  ].filter((c): c is { title: string; count: number | undefined; to: string; icon: typeof Building2 } => !!c)

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Receita do período" value={metrics.salesAmount} format="money" icon={Banknote} accent="chart-1" />
        <StatTile label="Comissão total" value={metrics.commissionGross} format="money" icon={Coins} accent="chart-2" />
        <StatTile label="Ticket médio" value={ticketMedio} format="money" icon={ReceiptText} accent="chart-3" />
        <StatTile label="Taxa de conversão" value={`${metrics.leadConversion}%`} icon={Percent} accent="chart-4" hint="lead → venda" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil comercial</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasFunnelData ? (
            <p className="text-muted-foreground text-sm">Nenhum movimento no funil no período.</p>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis type="category" dataKey="stage" width={90} fontSize={12} />
                  <Tooltip formatter={(value) => [value, 'Quantidade']} cursor={{ fill: 'var(--muted)' }} />
                  <Bar dataKey="count" radius={4}>
                    {funnelData.map((entry, idx) => (
                      <Cell key={entry.stage} fill={FUNNEL_STAGE_COLORS[idx]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {catalogTiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {catalogTiles.map((tile) => (
            <StatTile key={tile.title} label={tile.title} value={tile.count ?? '—'} icon={tile.icon} accent="chart-5" to={tile.to} size="sm" />
          ))}
        </div>
      )}
    </>
  )
}
