import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDocument } from '@/lib/cpf-cnpj'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { usePartners, useTogglePartnerActive, type Partner } from './api'
import { PartnerFormDialog } from './partner-form-dialog'
import { errorMessage } from '@/lib/errors'

export function PartnersListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: partners, isLoading, isError } = usePartners(tenant.id)
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

        {isError && <p className="text-destructive text-sm">Não foi possível carregar os parceiros.</p>}

        {partners && partners.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum parceiro cadastrado ainda.</p>
        )}

        {partners && partners.length > 0 && (
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
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">
                    {partner.name}{' '}
                    <span className="text-muted-foreground font-normal">({partner.person_type})</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.document ? formatDocument(partner.person_type, partner.document) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {partner.phone || partner.email || '—'}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar"
                      onClick={() => setEditing(partner)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
