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
import { LinkAdminDialog } from '@/features/tenants/link-admin-dialog'
import { TenantFormDialog } from '@/features/tenants/tenant-form-dialog'
import { useTenants, useToggleTenantActive, type Tenant } from '@/features/tenants/api'

export function TenantsListPage() {
  const { data: tenants, isLoading, isError } = useTenants()
  const toggleActive = useToggleTenantActive()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [linkingTenant, setLinkingTenant] = useState<Tenant | null>(null)

  async function handleToggleActive(tenant: Tenant, active: boolean) {
    try {
      await toggleActive.mutateAsync({ id: tenant.id, active })
      toast.success(active ? 'Imobiliária ativada.' : 'Imobiliária desativada.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imobiliárias</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Nova imobiliária
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <p className="text-destructive text-sm">Não foi possível carregar as imobiliárias.</p>
        )}

        {tenants && tenants.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhuma imobiliária cadastrada ainda.</p>
        )}

        {tenants && tenants.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Subdomínio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tenant.active}
                        onCheckedChange={(checked) => handleToggleActive(tenant, checked)}
                        aria-label={tenant.active ? 'Desativar imobiliária' : 'Ativar imobiliária'}
                      />
                      <Badge variant={tenant.active ? 'default' : 'secondary'}>
                        {tenant.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ações">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTenant(tenant)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLinkingTenant(tenant)}>
                          Vincular administrador
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <TenantFormDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setLinkingTenant} />
      <TenantFormDialog
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        tenant={editingTenant ?? undefined}
      />
      {linkingTenant && (
        <LinkAdminDialog
          open={!!linkingTenant}
          onOpenChange={(open) => !open && setLinkingTenant(null)}
          tenant={linkingTenant}
        />
      )}
    </Card>
  )
}
