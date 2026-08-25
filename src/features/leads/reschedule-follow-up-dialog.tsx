import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import { useRescheduleFollowUp, type LeadFollowUp } from './api'

export function RescheduleFollowUpDialog({
  open,
  onOpenChange,
  followUp,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  followUp: LeadFollowUp
}) {
  const [scheduledAt, setScheduledAt] = useState('')
  const reschedule = useRescheduleFollowUp()

  async function handleSubmit() {
    if (!scheduledAt) return
    try {
      await reschedule.mutateAsync({ id: followUp.id, scheduled_at: new Date(scheduledAt).toISOString() })
      toast.success('Follow-up reagendado.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível reagendar', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Reagendar follow-up</DialogTitle>
          <DialogDescription>Escolha a nova data e hora.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="reschedule-date">Data e hora</FieldLabel>
          <Input
            id="reschedule-date"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={reschedule.isPending || !scheduledAt}>
            {reschedule.isPending && <Loader2 className="animate-spin" />}
            Reagendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
