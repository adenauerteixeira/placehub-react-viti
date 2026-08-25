import { useState } from 'react'
import { toast } from 'sonner'
import { Handshake, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage } from '@/lib/errors'
import { useSaleByNegotiation } from '@/features/sales/api'
import { SaleFormDialog } from '@/features/sales/sale-form-dialog'
import { useDeleteProposal, useProposalsByNegotiation, type Proposal } from './api'
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_VARIANT } from './labels'
import { ProposalFormDialog } from './proposal-form-dialog'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function ProposalList({
  negotiationId,
  reservationId,
}: {
  negotiationId: string
  reservationId?: string | null
}) {
  const { data: proposals, isLoading, isError } = useProposalsByNegotiation(negotiationId)
  const { data: existingSale } = useSaleByNegotiation(negotiationId)
  const deleteProposal = useDeleteProposal(negotiationId)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [closingSaleFor, setClosingSaleFor] = useState<Proposal | null>(null)

  async function handleDelete(proposal: Proposal) {
    if (!window.confirm('Excluir esta proposta?')) return
    try {
      await deleteProposal.mutateAsync(proposal.id)
      toast.success('Proposta excluída.')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: errorMessage(error) })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Propostas</CardTitle>
        <CardAction>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Nova proposta
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && <p className="text-destructive text-sm">Não foi possível carregar as propostas.</p>}
        {proposals && proposals.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhuma proposta ainda.</p>
        )}
        {proposals && proposals.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Válida até</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">{formatPrice(proposal.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={PROPOSAL_STATUS_VARIANT[proposal.status]}>
                      {PROPOSAL_STATUS_LABELS[proposal.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(proposal.valid_until)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {proposal.status === 'accepted' && !existingSale && (
                        <Button size="sm" onClick={() => setClosingSaleFor(proposal)}>
                          <Handshake className="size-4" /> Fechar venda
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => setEditing(proposal)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        onClick={() => handleDelete(proposal)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ProposalFormDialog open={createOpen} onOpenChange={setCreateOpen} negotiationId={negotiationId} />
      {editing && (
        <ProposalFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          negotiationId={negotiationId}
          proposal={editing}
        />
      )}
      {closingSaleFor && (
        <SaleFormDialog
          open={!!closingSaleFor}
          onOpenChange={(open) => !open && setClosingSaleFor(null)}
          proposal={closingSaleFor}
          reservationId={reservationId}
        />
      )}
    </Card>
  )
}
