import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { formatDocument } from '@/lib/cpf-cnpj'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { usePartners, useTogglePartnerActive, type Partner } from './api'
import { PartnerFormDialog } from './partner-form-dialog'
import { errorMessage } from '@/lib/errors'

export function PartnersListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: partners, isLoading, isError, refetch } = usePartners(tenant.id)
  const toggleActive = useTogglePartnerActive(tenant.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)

  async function handleToggleActive(partner: Partner, active: boolean) {
    try {
      await toggleActive.mutateAsync({ id: partner.id, active })
      toast.success(active ? 'Parceiro ativado.' : 'Parceiro desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: errorMessage(error),
      })
    }
  }

  const columns: DataTableColumn<Partner>[] = [
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
        const partner = row.original
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={partner.active}
              onCheckedChange={(checked) => handleToggleActive(partner, checked)}
              aria-label={partner.active ? 'Desativar parceiro' : 'Ativar parceiro'}
            />
            <Badge variant={partner.active ? 'default' : 'secondary'}>
              {partner.active ? 'Ativo' : 'Inativo'}
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
        <CardTitle>Parceiros</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Novo parceiro
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <ErrorState title="Não foi possível carregar os parceiros." onRetry={() => refetch()} />
        )}

        {partners && partners.length === 0 && <EmptyState title="Nenhum parceiro cadastrado ainda." />}

        {partners && partners.length > 0 && (
          <DataTable columns={columns} data={partners} searchPlaceholder="Buscar por nome, documento..." />
        )}
      </CardContent>

      <PartnerFormDialog open={createOpen} onOpenChange={setCreateOpen} tenantId={tenant.id} />
      {editing && (
        <PartnerFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          tenantId={tenant.id}
          partner={editing}
        />
      )}
    </Card>
  )
}
