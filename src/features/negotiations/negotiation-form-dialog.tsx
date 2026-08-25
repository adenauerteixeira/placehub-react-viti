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
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useLeads } from '@/features/leads/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { errorMessage } from '@/lib/errors'
import { useCreateNegotiation } from './api'

const NONE = '__none__'

const schema = z.object({
  lead_id: z.string().min(1, 'Selecione um lead.'),
  announcement_id: z.string(),
  broker_id: z.string(),
  next_contact_at: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  lead_id: '',
  announcement_id: NONE,
  broker_id: NONE,
  next_contact_at: '',
  notes: '',
}

export function NegotiationFormDialog({
  open,
  onOpenChange,
  leadId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId?: string
}) {
  const { tenant } = useTenantOutletContext()
  const { data: leads } = useLeads(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const createNegotiation = useCreateNegotiation(tenant.id)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (open) reset({ ...emptyValues, lead_id: leadId ?? '' })
  }, [open, leadId, reset])

  async function onSubmit(values: FormValues) {
    try {
      const negotiation = await createNegotiation.mutateAsync({
        ...values,
        announcement_id: values.announcement_id === NONE ? '' : values.announcement_id,
        broker_id: values.broker_id === NONE ? '' : values.broker_id,
      })
      toast.success('Negociação criada.')
      onOpenChange(false)
      return negotiation
    } catch (error) {
      toast.error('Não foi possível criar a negociação', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nova negociação</DialogTitle>
          <DialogDescription>Inicia o acompanhamento comercial de um lead.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Lead</FieldLabel>
            <Select
              value={watch('lead_id')}
              onValueChange={(v) => setValue('lead_id', v)}
              disabled={!!leadId}
            >
              <SelectTrigger aria-invalid={!!errors.lead_id}>
                <SelectValue placeholder="Selecione um lead" />
              </SelectTrigger>
              <SelectContent>
                {leads?.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.lead_id && <p className="text-destructive text-sm">{errors.lead_id.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel hint="Opcional — o imóvel que está sendo negociado com esse lead.">
              Anúncio
            </FieldLabel>
            <Select value={watch('announcement_id')} onValueChange={(v) => setValue('announcement_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Nenhum</SelectItem>
                {announcements?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Corretor</FieldLabel>
              <Select value={watch('broker_id')} onValueChange={(v) => setValue('broker_id', v)}>
                <SelectTrigger>
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
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="negotiation-next-contact" hint="Próximo lembrete de contato com esse lead.">
                Próximo contato
              </FieldLabel>
              <Input id="negotiation-next-contact" type="datetime-local" {...register('next_contact_at')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="negotiation-notes">Observações</FieldLabel>
            <Textarea id="negotiation-notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createNegotiation.isPending}>
              {createNegotiation.isPending && <Loader2 className="animate-spin" />}
              Criar negociação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
