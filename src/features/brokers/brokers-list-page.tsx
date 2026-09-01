import { useState } from 'react'
import { Pencil, Plus, User } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { brokerPhotoUrl, useBrokers, useToggleBrokerActive, type Broker } from './api'
import { BrokerFormDialog } from './broker-form-dialog'
import { errorMessage } from '@/lib/errors'

export function BrokersListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: brokers, isLoading, isError, refetch } = useBrokers(tenant.id)
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

  const columns: DataTableColumn<Broker>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => {
        const broker = row.original
        const photoUrl = brokerPhotoUrl(broker.photo_path, broker.updated_at)
        return (
          <div className="flex items-center gap-2 font-medium">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border">
              {photoUrl ? (
                <img src={photoUrl} alt={broker.name} className="size-full object-cover" />
              ) : (
                <User className="text-muted-foreground size-4" />
              )}
            </div>
            {broker.name}
          </div>
        )
      },
    },
    {
      id: 'creci',
      accessorFn: (row) => (row.creci ? (row.creci_state ? `${row.creci}/${row.creci_state}` : row.creci) : '—'),
      header: 'CRECI',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      accessorKey: 'commission_percentage',
      header: 'Comissão',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {Number(row.original.commission_percentage).toLocaleString('pt-BR')}%
        </span>
      ),
    },
    {
      id: 'active',
      accessorFn: (row) => (row.active ? 'Ativo' : 'Inativo'),
      header: 'Status',
      cell: ({ row }) => {
        const broker = row.original
        return (
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
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditing(row.original)}>
            <Pencil className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corretores</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Novo corretor</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <ErrorState title="Não foi possível carregar os corretores." onRetry={() => refetch()} />
        )}

        {brokers && brokers.length === 0 && <EmptyState title="Nenhum corretor cadastrado ainda." />}

        {brokers && brokers.length > 0 && (
          <DataTable columns={columns} data={brokers} searchPlaceholder="Buscar por nome, CRECI..." />
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
