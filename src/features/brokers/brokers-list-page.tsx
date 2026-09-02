import { useState } from 'react'
import { Pencil, User } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateButton } from '@/components/create-button'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Switch } from '@/components/ui/switch'
import { TableSkeleton } from '@/components/table-skeleton'
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
  // Precisa vir de `data`, não de uma closure em `columns` — ver nota em
  // partners-list-page.tsx.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  async function handleToggleActive(broker: Broker, active: boolean) {
    setPendingIds((prev) => new Set(prev).add(broker.id))
    try {
      await toggleActive.mutateAsync({ id: broker.id, active })
      toast.success(active ? 'Corretor ativado.' : 'Corretor desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: errorMessage(error),
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(broker.id)
        return next
      })
    }
  }

  const brokersWithPending = brokers?.map((b) => ({ ...b, _pending: pendingIds.has(b.id) }))

  const columns: DataTableColumn<Broker & { _pending: boolean }>[] = [
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
              disabled={broker._pending}
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
          <CreateButton label="Novo corretor" onClick={() => setCreateOpen(true)} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <TableSkeleton columns={5} />}

        {isError && (
          <ErrorState title="Não foi possível carregar os corretores." onRetry={() => refetch()} />
        )}

        {brokers && brokers.length === 0 && <EmptyState title="Nenhum corretor cadastrado ainda." />}

        {brokersWithPending && brokersWithPending.length > 0 && (
          <DataTable columns={columns} data={brokersWithPending} searchPlaceholder="Buscar por nome, CRECI..." />
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
