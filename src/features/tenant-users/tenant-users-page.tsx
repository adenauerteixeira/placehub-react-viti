import { useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useTenantUsers, useToggleTenantUserActive, type TenantUser } from './api'
import { EditUserDialog } from './edit-user-dialog'
import { InviteUserDialog } from './invite-user-dialog'
import { ROLE_LABELS } from './permissions'

export function TenantUsersPage() {
  const { tenant, profile } = useTenantOutletContext()
  const { data: users, isLoading, isError } = useTenantUsers(tenant.id)
  const toggleActive = useToggleTenantUserActive(tenant.id)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)

  async function handleToggleActive(user: TenantUser, is_active: boolean) {
    try {
      await toggleActive.mutateAsync({ id: user.id, is_active })
      toast.success(is_active ? 'Usuário ativado.' : 'Usuário desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

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

        {isError && <p className="text-destructive text-sm">Não foi possível carregar os usuários.</p>}

        {users && users.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ações">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>Editar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
