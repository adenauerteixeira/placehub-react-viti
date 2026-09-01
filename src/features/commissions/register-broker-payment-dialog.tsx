import { useEffect, useState } from 'react'
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
import { errorMessage } from '@/lib/errors'
import { useRegisterBrokerPayment, type CommissionInstallment } from './api'

const schema = z.object({
  paid_at: z.string().min(1, 'Informe a data do repasse.'),
  payment_method: z.string().min(1, 'Informe a forma de pagamento.'),
  payment_notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  paid_at: new Date().toISOString().slice(0, 10),
  payment_method: '',
  payment_notes: '',
}

export function RegisterBrokerPaymentDialog({
  open,
  onOpenChange,
  installment,
  tenantId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  installment: CommissionInstallment
  tenantId: string
}) {
  const registerPayment = useRegisterBrokerPayment(tenantId)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (open) {
      reset(emptyValues)
      setReceiptFile(null)
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await registerPayment.mutateAsync({
        id: installment.id,
        commission_id: installment.commission_id,
        ...values,
        receiptFile,
      })
      toast.success('Repasse registrado. O corretor vai precisar confirmar o recebimento.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível registrar o repasse', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Registrar repasse ao corretor</DialogTitle>
          <DialogDescription>
            Parcela {installment.number} — {installment.broker_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Data do repasse" htmlFor="broker-payment-date" error={errors.paid_at?.message}>
            <Input id="broker-payment-date" type="date" {...register('paid_at')} aria-invalid={!!errors.paid_at} />
          </Field>

          <Field
            label="Forma de pagamento"
            htmlFor="broker-payment-method"
            error={errors.payment_method?.message}
          >
            <Input
              id="broker-payment-method"
              placeholder="Pix, transferência, dinheiro..."
              {...register('payment_method')}
              aria-invalid={!!errors.payment_method}
            />
          </Field>

          <Field label="Comprovante" htmlFor="broker-payment-receipt">
            <Input
              id="broker-payment-receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={registerPayment.isPending}>
              {registerPayment.isPending && <Loader2 className="animate-spin" />}
              Registrar repasse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
