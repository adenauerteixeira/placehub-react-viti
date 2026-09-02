import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnnouncements } from '@/features/announcements/api'
import { hasPermission } from '@/features/auth/use-profile'
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

  const { data: announcements } = useAnnouncements(hasPermission(profile, 'announcements') ? tenant.id : null)
  const { data: developments } = useDevelopments(hasPermission(profile, 'developments') ? tenant.id : null)
  const { data: partners } = usePartners(hasPermission(profile, 'partners') ? tenant.id : null)
  const { data: users } = useTenantUsers(hasPermission(profile, 'users') ? tenant.id : null)

  const leadName = (id: string) => leads?.find((l) => l.id === id)?.name ?? 'Lead'

  const adminCards = [
    hasPermission(profile, 'announcements') && { title: 'Anúncios', count: announcements?.length, to: '/announcements' },
    hasPermission(profile, 'developments') && { title: 'Empreendimentos', count: developments?.length, to: '/developments' },
    hasPermission(profile, 'partners') && { title: 'Parceiros', count: partners?.length, to: '/partners' },
    hasPermission(profile, 'users') && {
      title: 'Usuários ativos',
      count: users?.filter((u) => u.is_active).length,
      to: '/users',
    },
  ].filter((c): c is { title: string; count: number | undefined; to: string } => !!c)

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {metrics && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard title="Leads" value={String(metrics.totalLeads)} hint={`${metrics.leadConversion}% convertidos`} />
          <MetricCard title="Negociações ativas" value={String(metrics.activeNegotiations)} />
          <MetricCard
            title="Propostas"
            value={String(metrics.totalProposals)}
            hint={`${metrics.proposalConversion}% aceitas`}
          />
          <MetricCard title="Vendas" value={String(metrics.salesCount)} hint={formatPrice(metrics.salesAmount)} />
          <MetricCard
            title={isBroker ? 'Sua comissão' : 'Comissão total'}
            value={formatPrice(isBroker ? metrics.commissionBroker : metrics.commissionGross)}
          />
        </div>
      )}

      {adminCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {adminCards.map((card) => (
            <Link key={card.title} to={card.to}>
              <Card className="hover:bg-accent/40 transition-colors">
                <CardContent className="pt-6">
                  <p className="text-2xl font-semibold">{card.count ?? '—'}</p>
                  <p className="text-muted-foreground text-sm">{card.title}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

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

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xl font-semibold">{value}</p>
        <p className="text-muted-foreground text-sm">{title}</p>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}
