import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useBrokers } from '@/features/brokers/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { errorMessage } from '@/lib/errors'
import { useScheduleFollowUp, type Lead } from './api'

const NONE = '__none__'

const schema = z.object({
  scheduled_at: z.string().min(1, 'Informe data e hora.'),
  broker_id: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

export function ScheduleFollowUpDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
}) {
  const { tenant } = useTenantOutletContext()
  const { data: brokers } = useBrokers(tenant.id)
  const schedule = useScheduleFollowUp(lead.id)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scheduled_at: '', broker_id: lead.broker_id ?? NONE, notes: '' },
  })

  useEffect(() => {
    if (open) reset({ scheduled_at: '', broker_id: lead.broker_id ?? NONE, notes: '' })
  }, [open, lead, reset])

  async function onSubmit(values: FormValues) {
    try {
      await schedule.mutateAsync({
        scheduled_at: new Date(values.scheduled_at).toISOString(),
        broker_id: values.broker_id === NONE ? '' : values.broker_id,
        notes: values.notes,
      })
      toast.success('Follow-up agendado.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível agendar', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Agendar follow-up</DialogTitle>
          <DialogDescription>Marque o próximo contato com {lead.name}.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Data e hora" htmlFor="follow-up-date" error={errors.scheduled_at?.message}>
            <Input
              id="follow-up-date"
              type="datetime-local"
              {...register('scheduled_at')}
              aria-invalid={!!errors.scheduled_at}
            />
          </Field>

          <Field label="Responsável" htmlFor="follow-up-broker">
            <Select value={watch('broker_id')} onValueChange={(v) => setValue('broker_id', v)}>
              <SelectTrigger id="follow-up-broker">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Não atribuído</SelectItem>
                {brokers?.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Observações" htmlFor="follow-up-notes">
            <Textarea id="follow-up-notes" rows={3} {...register('notes')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={schedule.isPending}>
              {schedule.isPending && <Loader2 className="animate-spin" />}
              Agendar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
