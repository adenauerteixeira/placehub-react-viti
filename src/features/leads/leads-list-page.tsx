import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBrokers } from '@/features/brokers/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { AgendaTab } from './agenda-tab'
import { useLeads } from './api'
import { LeadFormDialog } from './lead-form-dialog'
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_VARIANT } from './labels'

export function LeadsListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: leads, isLoading, isError } = useLeads(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const [createOpen, setCreateOpen] = useState(false)

  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Novo lead
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="pt-4">
            {isLoading && <Skeleton className="h-40 w-full" />}
            {isError && <p className="text-destructive text-sm">Não foi possível carregar os leads.</p>}
            {leads && leads.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum lead cadastrado ainda.</p>
            )}
            {leads && leads.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Corretor</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.phone || lead.email || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{LEAD_SOURCE_LABELS[lead.source]}</TableCell>
                      <TableCell>
                        <Badge variant={LEAD_STATUS_VARIANT[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{brokerName(lead.broker_id)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ver detalhes"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="agenda" className="pt-4">
            <AgendaTab />
          </TabsContent>
        </Tabs>
      </CardContent>

      <LeadFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  )
}
