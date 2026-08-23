import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useDevelopments, type Development } from './api'
import { DevelopmentFormDialog } from './development-form-dialog'
import { DEVELOPMENT_STATUS_LABELS, DEVELOPMENT_STATUS_VARIANT, DEVELOPMENT_TYPE_LABELS } from './labels'

export function DevelopmentsListPage() {
  const { tenant } = useTenantOutletContext()
  const { data: developments, isLoading, isError } = useDevelopments(tenant.id)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Development | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empreendimentos</CardTitle>
        <CardAction>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Novo empreendimento
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <p className="text-destructive text-sm">Não foi possível carregar os empreendimentos.</p>
        )}

        {developments && developments.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum empreendimento cadastrado ainda.</p>
        )}

        {developments && developments.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Incorporadora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {developments.map((development) => (
                <TableRow key={development.id}>
                  <TableCell className="font-medium">{development.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {DEVELOPMENT_TYPE_LABELS[development.type]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {development.developer || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={DEVELOPMENT_STATUS_VARIANT[development.status]}>
                      {DEVELOPMENT_STATUS_LABELS[development.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar"
                      onClick={() => setEditing(development)}
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
