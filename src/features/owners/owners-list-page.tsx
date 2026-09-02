import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Switch } from '@/components/ui/switch'
import { TableSkeleton } from '@/components/table-skeleton'
import { formatDocument } from '@/lib/cpf-cnpj'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useOwners, useToggleOwnerActive, type Owner } from './api'
import { OwnerFormDialog } from './owner-form-dialog'
import { errorMessage } from '@/lib/errors'

export function OwnersListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: owners, isLoading, isError, refetch } = useOwners(tenant.id)
  const toggleActive = useToggleOwnerActive(tenant.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Owner | null>(null)
  // Precisa vir de `data`, não de uma closure em `columns` — ver nota em
  // partners-list-page.tsx.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  async function handleToggleActive(owner: Owner, active: boolean) {
    setPendingIds((prev) => new Set(prev).add(owner.id))
    try {
      await toggleActive.mutateAsync({ id: owner.id, active })
      toast.success(active ? 'Proprietário ativado.' : 'Proprietário desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: errorMessage(error),
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(owner.id)
        return next
      })
    }
  }

  const ownersWithPending = owners?.map((o) => ({ ...o, _pending: pendingIds.has(o.id) }))

  const columns: DataTableColumn<Owner & { _pending: boolean }>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name}{' '}
          <span className="text-muted-foreground font-normal">({row.original.person_type})</span>
        </span>
      ),
    },
    {
      id: 'document',
      accessorFn: (row) => (row.document ? formatDocument(row.person_type, row.document) : '—'),
      header: 'Documento',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'contact',
      accessorFn: (row) => row.phone || row.email || '—',
      header: 'Contato',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'active',
      accessorFn: (row) => (row.active ? 'Ativo' : 'Inativo'),
      header: 'Status',
      cell: ({ row }) => {
        const owner = row.original
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={owner.active}
              onCheckedChange={(checked) => handleToggleActive(owner, checked)}
              disabled={owner._pending}
              aria-label={owner.active ? 'Desativar proprietário' : 'Ativar proprietário'}
            />
            <Badge variant={owner.active ? 'default' : 'secondary'}>
              {owner.active ? 'Ativo' : 'Inativo'}
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
        <CardTitle>Proprietários</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Novo proprietário</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <TableSkeleton columns={5} />}

        {isError && (
          <ErrorState title="Não foi possível carregar os proprietários." onRetry={() => refetch()} />
        )}

        {owners && owners.length === 0 && <EmptyState title="Nenhum proprietário cadastrado ainda." />}

        {ownersWithPending && ownersWithPending.length > 0 && (
          <DataTable
            columns={columns}
            data={ownersWithPending}
            searchPlaceholder="Buscar por nome, documento..."
          />
        )}
      </CardContent>

      <OwnerFormDialog open={createOpen} onOpenChange={setCreateOpen} tenantId={tenant.id} />
      {editing && (
        <OwnerFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          tenantId={tenant.id}
          owner={editing}
        />
      )}
    </Card>
  )
}
