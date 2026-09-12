import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateButton } from '@/components/create-button'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { TableSkeleton } from '@/components/table-skeleton'
import { errorMessage } from '@/lib/errors'
import { useProfile } from '@/features/auth/use-profile'
import { InvitePlatformUserDialog } from './invite-platform-user-dialog'
import { usePlatformUsers, useUpdatePlatformProfile, type PlatformUser } from './api'

export function PlatformUsersPage() {
  const { data: profile } = useProfile()
  const { data: users, isLoading, isError, refetch } = usePlatformUsers()
  const updateProfile = useUpdatePlatformProfile()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => setName(profile?.full_name ?? ''), [profile?.full_name])

  async function saveName() {
    if (!profile) return
    try {
      await updateProfile.mutateAsync({ id: profile.id, full_name: name })
      toast.success('Seu nome foi atualizado.')
    } catch (error) {
      toast.error('Não foi possível atualizar seu nome', { description: errorMessage(error) })
    }
  }

  const columns: DataTableColumn<PlatformUser>[] = [
    { id: 'name', accessorFn: (row) => row.full_name || '—', header: 'Nome', cell: (info) => <span className="font-medium">{info.getValue()}</span> },
    { accessorKey: 'email', header: 'E-mail', cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span> },
    { id: 'role', accessorFn: () => 'Administrador da plataforma', header: 'Papel' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Usuários da plataforma</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">Gerencie quem possui acesso completo ao Console PlaceHub.</p>
      </section>
      <Card>
        <CardHeader><CardTitle>Seu perfil</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4 sm:max-w-md">
          <Field label="Nome" htmlFor="platform-profile-name">
            <Input id="platform-profile-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" />
          </Field>
          <Button className="w-fit" onClick={saveName} disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Salvando...' : 'Salvar nome'}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Administradores</CardTitle>
          <CardAction><CreateButton label="Novo usuário da plataforma" onClick={() => setInviteOpen(true)} /></CardAction>
        </CardHeader>
        <CardContent>
          {isLoading && <TableSkeleton columns={3} />}
          {isError && <ErrorState title="Não foi possível carregar os usuários." onRetry={() => refetch()} />}
          {users && users.length === 0 && <EmptyState title="Nenhum administrador cadastrado." />}
          {users && users.length > 0 && <DataTable columns={columns} data={users} searchPlaceholder="Buscar por nome ou e-mail..." />}
        </CardContent>
      </Card>
      <InvitePlatformUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}
