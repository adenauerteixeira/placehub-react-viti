import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { PhoneInput } from '@/components/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useBrokers } from '@/features/brokers/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { capitalizeName } from '@/lib/capitalize'
import { errorMessage } from '@/lib/errors'
import { useCreateLead, type LeadSource } from './api'
import { LEAD_SOURCE_LABELS } from './labels'

const NONE = '__none__'
const SOURCES = Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  phone: z.string(),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  source: z.enum(SOURCES as [LeadSource, ...LeadSource[]]),
  broker_id: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  name: '',
  phone: '',
  email: '',
  source: 'manual',
  broker_id: NONE,
  notes: '',
}

export function LeadFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { tenant } = useTenantOutletContext()
  const { data: brokers } = useBrokers(tenant.id)
  const createLead = useCreateLead(tenant.id)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (open) reset(emptyValues)
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createLead.mutateAsync({
        ...values,
        broker_id: values.broker_id === NONE ? '' : values.broker_id,
        announcement_id: '',
      })
      toast.success('Lead criado.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível criar o lead', { description: errorMessage(error) })
    }
  }

  const nameField = register('name')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Registre um contato interessado em algum imóvel.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="lead-name">Nome</FieldLabel>
            <Input
              id="lead-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('name', capitalizeName(e.target.value))
              }}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="lead-phone">Telefone</FieldLabel>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => <PhoneInput id="lead-phone" value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="lead-email">E-mail</FieldLabel>
              <Input id="lead-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Como esse contato chegou até você.">Origem</FieldLabel>
              <Select value={watch('source')} onValueChange={(v) => setValue('source', v as LeadSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {LEAD_SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Deixe em branco pra entrar na fila de leads não atribuídos.">Corretor</FieldLabel>
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
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="lead-notes">Observações</FieldLabel>
            <Textarea id="lead-notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && <Loader2 className="animate-spin" />}
              Criar lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
