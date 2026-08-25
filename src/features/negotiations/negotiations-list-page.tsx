import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useLeads } from '@/features/leads/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useNegotiations } from './api'
import { NegotiationFormDialog } from './negotiation-form-dialog'
import { NEGOTIATION_STATUS_LABELS, NEGOTIATION_STATUS_VARIANT } from './labels'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function NegotiationsListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: negotiations, isLoading, isError } = useNegotiations(tenant.id)
  const { data: leads } = useLeads(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const [createOpen, setCreateOpen] = useState(false)

  const leadName = (id: string) => leads?.find((l) => l.id === id)?.name ?? '—'
  const announcementTitle = (id: string | null) => announcements?.find((a) => a.id === id)?.title ?? '—'
  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Negociações</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Nova negociação
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && <p className="text-destructive text-sm">Não foi possível carregar as negociações.</p>}
        {negotiations && negotiations.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhuma negociação cadastrada ainda.</p>
        )}
        {negotiations && negotiations.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Anúncio</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {negotiations.map((negotiation) => (
                <TableRow key={negotiation.id}>
                  <TableCell className="font-medium">{leadName(negotiation.lead_id)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {announcementTitle(negotiation.announcement_id)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{brokerName(negotiation.broker_id)}</TableCell>
                  <TableCell>
                    <Badge variant={NEGOTIATION_STATUS_VARIANT[negotiation.status]}>
                      {NEGOTIATION_STATUS_LABELS[negotiation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(negotiation.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ver detalhes"
                      onClick={() => navigate(`/negotiations/${negotiation.id}`)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <NegotiationFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  )
}
