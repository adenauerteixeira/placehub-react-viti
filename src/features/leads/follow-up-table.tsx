import { useState } from 'react'
import { CalendarClock, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CompleteFollowUpDialog } from './complete-follow-up-dialog'
import { RescheduleFollowUpDialog } from './reschedule-follow-up-dialog'
import type { AgendaFollowUp, LeadFollowUp } from './api'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function statusBadge(followUp: LeadFollowUp) {
  if (followUp.completed_at) {
    return <Badge variant="secondary">Concluído</Badge>
  }
  const isOverdue = new Date(followUp.scheduled_at) < new Date()
  if (isOverdue) return <Badge variant="destructive">Atrasado</Badge>
  return <Badge variant="outline">Agendado</Badge>
}

export function FollowUpTable({
  followUps,
  showLeadColumn = false,
}: {
  followUps: (LeadFollowUp | AgendaFollowUp)[]
  showLeadColumn?: boolean
}) {
  const [completing, setCompleting] = useState<LeadFollowUp | null>(null)
  const [rescheduling, setRescheduling] = useState<LeadFollowUp | null>(null)

  if (followUps.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhum follow-up por aqui.</p>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {showLeadColumn && <TableHead>Lead</TableHead>}
            <TableHead>Quando</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Observações</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {followUps.map((followUp) => (
            <TableRow key={followUp.id}>
              {showLeadColumn && (
                <TableCell className="font-medium">{(followUp as AgendaFollowUp).lead_name}</TableCell>
              )}
              <TableCell>{formatDateTime(followUp.scheduled_at)}</TableCell>
              <TableCell>{statusBadge(followUp)}</TableCell>
              <TableCell className="text-muted-foreground max-w-64 truncate">
                {followUp.completed_at ? followUp.result || '—' : followUp.notes || '—'}
              </TableCell>
              <TableCell>
                {!followUp.completed_at && (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Reagendar"
                      onClick={() => setRescheduling(followUp)}
                    >
                      <CalendarClock className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Concluir"
                      onClick={() => setCompleting(followUp)}
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {completing && (
        <CompleteFollowUpDialog
          open={!!completing}
          onOpenChange={(open) => !open && setCompleting(null)}
          followUp={completing}
        />
      )}
      {rescheduling && (
        <RescheduleFollowUpDialog
          open={!!rescheduling}
          onOpenChange={(open) => !open && setRescheduling(null)}
          followUp={rescheduling}
        />
      )}
    </>
  )
}
