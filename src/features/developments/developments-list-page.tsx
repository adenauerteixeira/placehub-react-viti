import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { TableSkeleton } from '@/components/table-skeleton'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useDevelopments, type Development } from './api'
import { DevelopmentFormDialog } from './development-form-dialog'
import { DEVELOPMENT_STATUS_LABELS, DEVELOPMENT_STATUS_VARIANT, DEVELOPMENT_TYPE_LABELS } from './labels'

export function DevelopmentsListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: developments, isLoading, isError, refetch } = useDevelopments(tenant.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Development | null>(null)

  const columns: DataTableColumn<Development>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'type',
      accessorFn: (row) => DEVELOPMENT_TYPE_LABELS[row.type],
      header: 'Tipo',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      accessorKey: 'developer',
      header: 'Incorporadora',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.developer || '—'}</span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => DEVELOPMENT_STATUS_LABELS[row.status],
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={DEVELOPMENT_STATUS_VARIANT[row.original.status]}>
          {DEVELOPMENT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
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
        <CardTitle>Empreendimentos</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Novo empreendimento</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <TableSkeleton columns={5} />}

        {isError && (
          <ErrorState
            title="Não foi possível carregar os empreendimentos."
            onRetry={() => refetch()}
          />
        )}

        {developments && developments.length === 0 && (
          <EmptyState title="Nenhum empreendimento cadastrado ainda." />
        )}

        {developments && developments.length > 0 && (
          <DataTable columns={columns} data={developments} searchPlaceholder="Buscar por nome..." />
        )}
      </CardContent>

      <DevelopmentFormDialog open={createOpen} onOpenChange={setCreateOpen} tenantId={tenant.id} />
      {editing && (
        <DevelopmentFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          tenantId={tenant.id}
          development={editing}
        />
      )}
    </Card>
  )
}
