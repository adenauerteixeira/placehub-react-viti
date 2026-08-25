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
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import { useCompleteFollowUp, type LeadFollowUp } from './api'

export function CompleteFollowUpDialog({
  open,
  onOpenChange,
  followUp,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  followUp: LeadFollowUp
}) {
  const [result, setResult] = useState('')
  const complete = useCompleteFollowUp()

  async function handleSubmit() {
    try {
      await complete.mutateAsync({ id: followUp.id, result })
      toast.success('Follow-up concluído.')
      onOpenChange(false)
      setResult('')
    } catch (error) {
      toast.error('Não foi possível concluir', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Concluir follow-up</DialogTitle>
          <DialogDescription>O que aconteceu nesse contato?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="follow-up-result">Resultado</FieldLabel>
          <Textarea
            id="follow-up-result"
            rows={3}
            value={result}
            onChange={(e) => setResult(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={complete.isPending}>
            {complete.isPending && <Loader2 className="animate-spin" />}
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
