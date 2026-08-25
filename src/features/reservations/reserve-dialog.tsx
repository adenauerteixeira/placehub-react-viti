import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
import { useReserveAnnouncement } from './api'

const NONE = '__none__'

function defaultExpiry() {
  const d = new Date(Date.now() + 3 * 24 * 3600 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const schema = z.object({
  customer_name: z.string().min(2, 'Informe o nome.'),
  customer_phone: z.string(),
  customer_email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  expires_at: z.string().min(1, 'Informe até quando a reserva é válida.'),
  broker_id: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

function emptyValues(brokerId?: string): FormValues {
  return {
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    expires_at: defaultExpiry(),
    broker_id: brokerId ?? NONE,
    notes: '',
  }
}

export function ReserveDialog({
  open,
  onOpenChange,
  announcementId,
  leadId,
  brokerId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcementId: string
  leadId?: string
  brokerId?: string
}) {
  const { tenant } = useTenantOutletContext()
  const { data: brokers } = useBrokers(tenant.id)
  const reserve = useReserveAnnouncement(tenant.id)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues(brokerId) })

  useEffect(() => {
    if (open) reset(emptyValues(brokerId))
  }, [open, brokerId, reset])

  async function onSubmit(values: FormValues) {
    try {
      await reserve.mutateAsync({
        announcement_id: announcementId,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email,
        expires_at: values.expires_at,
        lead_id: leadId ?? '',
        broker_id: values.broker_id === NONE ? '' : values.broker_id,
        notes: values.notes,
      })
      toast.success('Imóvel reservado.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível reservar', { description: errorMessage(error) })
    }
  }

  const nameField = register('customer_name')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Reservar imóvel</DialogTitle>
          <DialogDescription>Segura o anúncio pra um cliente por um período.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="reserve-customer-name">Cliente</FieldLabel>
            <Input
              id="reserve-customer-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('customer_name', capitalizeName(e.target.value))
              }}
              aria-invalid={!!errors.customer_name}
            />
            {errors.customer_name && (
              <p className="text-destructive text-sm">{errors.customer_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="reserve-customer-phone">Telefone</FieldLabel>
              <Controller
                control={control}
                name="customer_phone"
                render={({ field }) => (
                  <PhoneInput id="reserve-customer-phone" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="reserve-customer-email">E-mail</FieldLabel>
              <Input
                id="reserve-customer-email"
                type="email"
                {...register('customer_email')}
                aria-invalid={!!errors.customer_email}
              />
              {errors.customer_email && (
                <p className="text-destructive text-sm">{errors.customer_email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="reserve-expires-at" hint="Depois dessa data a reserva expira sozinha e o anúncio volta a ficar publicado.">
                Válida até
              </FieldLabel>
              <Input
                id="reserve-expires-at"
                type="datetime-local"
                {...register('expires_at')}
                aria-invalid={!!errors.expires_at}
              />
              {errors.expires_at && <p className="text-destructive text-sm">{errors.expires_at.message}</p>}
            </div>
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
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="reserve-notes">Observações</FieldLabel>
            <Textarea id="reserve-notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={reserve.isPending}>
              {reserve.isPending && <Loader2 className="animate-spin" />}
              Reservar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
