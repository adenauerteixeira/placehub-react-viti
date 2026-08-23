import { useState } from 'react'
import { Pencil, Plus, User } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { brokerPhotoUrl, useBrokers, useToggleBrokerActive, type Broker } from './api'
import { BrokerFormDialog } from './broker-form-dialog'
import { errorMessage } from '@/lib/errors'

export function BrokersListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: brokers, isLoading, isError } = useBrokers(tenant.id)
  const toggleActive = useToggleBrokerActive(tenant.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Broker | null>(null)

  async function handleToggleActive(broker: Broker, active: boolean) {
    try {
      await toggleActive.mutateAsync({ id: broker.id, active })
      toast.success(active ? 'Corretor ativado.' : 'Corretor desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: errorMessage(error),
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corretores</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Novo corretor
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && <p className="text-destructive text-sm">Não foi possível carregar os corretores.</p>}

        {brokers && brokers.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum corretor cadastrado ainda.</p>
        )}

        {brokers && brokers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CRECI</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {brokers.map((broker) => {
                const photoUrl = brokerPhotoUrl(broker.photo_path, broker.updated_at)
                return (
                  <TableRow key={broker.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                          {photoUrl ? (
                            <img src={photoUrl} alt={broker.name} className="size-full object-cover" />
                          ) : (
                            <User className="text-muted-foreground size-4" />
                          )}
                        </div>
                        {broker.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {broker.creci
                        ? broker.creci_state
                          ? `${broker.creci}/${broker.creci_state}`
                          : broker.creci
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {Number(broker.commission_percentage).toLocaleString('pt-BR')}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={broker.active}
                          onCheckedChange={(checked) => handleToggleActive(broker, checked)}
                          aria-label={broker.active ? 'Desativar corretor' : 'Ativar corretor'}
                        />
                        <Badge variant={broker.active ? 'default' : 'secondary'}>
                          {broker.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => setEditing(broker)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <BrokerFormDialog open={createOpen} onOpenChange={setCreateOpen} tenantId={tenant.id} />
      {editing && (
        <BrokerFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          tenantId={tenant.id}
          broker={editing}
        />
      )}
    </Card>
  )
}
