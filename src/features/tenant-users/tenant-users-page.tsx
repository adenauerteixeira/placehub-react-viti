import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { errorMessage } from '@/lib/errors'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useTenantUsers, useToggleTenantUserActive, type TenantUser } from './api'
import { EditUserDialog } from './edit-user-dialog'
import { InviteUserDialog } from './invite-user-dialog'
import { ROLE_LABELS } from './permissions'

export function TenantUsersPage() {
  const { tenant, profile } = useTenantOutletContext()
  const { data: users, isLoading, isError, refetch } = useTenantUsers(tenant.id)
  const toggleActive = useToggleTenantUserActive(tenant.id)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)

  async function handleToggleActive(user: TenantUser, is_active: boolean) {
    try {
      await toggleActive.mutateAsync({ id: user.id, is_active })
      toast.success(is_active ? 'Usuário ativado.' : 'Usuário desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: errorMessage(error),
      })
    }
  }

  const columns: DataTableColumn<TenantUser>[] = [
    {
      id: 'full_name',
      accessorFn: (row) => row.full_name || '—',
      header: 'Nome',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    },
    {
      accessorKey: 'email',
      header: 'E-mail',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: 'role',
      accessorFn: (row) => ROLE_LABELS[row.role] ?? row.role,
      header: 'Papel',
      cell: (info) => <Badge variant="secondary">{info.getValue()}</Badge>,
    },
    {
      id: 'active',
      accessorFn: (row) => (row.is_active ? 'Ativo' : 'Inativo'),
      header: 'Status',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={user.is_active}
              disabled={user.id === profile.id}
              onCheckedChange={(checked) => handleToggleActive(user, checked)}
              aria-label={user.is_active ? 'Desativar usuário' : 'Ativar usuário'}
            />
            <Badge variant={user.is_active ? 'default' : 'secondary'}>
              {user.is_active ? 'Ativo' : 'Inativo'}
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar"
            onClick={() => setEditingUser(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardAction>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" /> Novo usuário
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <ErrorState title="Não foi possível carregar os usuários." onRetry={() => refetch()} />
        )}

        {users && users.length === 0 && <EmptyState title="Nenhum usuário cadastrado ainda." />}

        {users && users.length > 0 && (
          <DataTable columns={columns} data={users} searchPlaceholder="Buscar por nome, e-mail..." />
        )}
      </CardContent>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} tenantId={tenant.id} />
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          tenantId={tenant.id}
          user={editingUser}
        />
      )}
    </Card>
  )
}
