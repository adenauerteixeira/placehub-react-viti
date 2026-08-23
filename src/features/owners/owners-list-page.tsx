import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDocument } from '@/lib/cpf-cnpj'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useOwners, useToggleOwnerActive, type Owner } from './api'
import { OwnerFormDialog } from './owner-form-dialog'

export function OwnersListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: owners, isLoading, isError } = useOwners(tenant.id)
  const toggleActive = useToggleOwnerActive(tenant.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Owner | null>(null)

  async function handleToggleActive(owner: Owner, active: boolean) {
    try {
      await toggleActive.mutateAsync({ id: owner.id, active })
      toast.success(active ? 'Proprietário ativado.' : 'Proprietário desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Proprietários</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Novo proprietário
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && <p className="text-destructive text-sm">Não foi possível carregar os proprietários.</p>}

        {owners && owners.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum proprietário cadastrado ainda.</p>
        )}

        {owners && owners.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => (
                <TableRow key={owner.id} className="cursor-pointer" onClick={() => setEditing(owner)}>
                  <TableCell className="font-medium">
                    {owner.name}{' '}
                    <span className="text-muted-foreground font-normal">({owner.person_type})</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {owner.document ? formatDocument(owner.person_type, owner.document) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {owner.phone || owner.email || '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={owner.active}
                        onCheckedChange={(checked) => handleToggleActive(owner, checked)}
                        aria-label={owner.active ? 'Desativar proprietário' : 'Ativar proprietário'}
                      />
                      <Badge variant={owner.active ? 'default' : 'secondary'}>
                        {owner.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(owner)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
