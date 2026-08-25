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
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import { useReceiveInstallment, type SaleEntryInstallment } from './api'

const schema = z.object({
  payment_method: z.string().min(1, 'Informe a forma de pagamento.'),
  payer_name: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = { payment_method: '', payer_name: '' }

export function ReceiveInstallmentDialog({
  open,
  onOpenChange,
  installment,
  saleId,
  tenantId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  installment: SaleEntryInstallment
  saleId: string
  tenantId: string
}) {
  const receive = useReceiveInstallment(saleId, tenantId)
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
      await receive.mutateAsync({ id: installment.id, ...values, receiptFile })
      toast.success('Parcela recebida.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível marcar como recebida', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Receber parcela {installment.number}</DialogTitle>
          <DialogDescription>
            Valor: {installment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="receive-payment-method">Forma de pagamento</FieldLabel>
            <Input
              id="receive-payment-method"
              placeholder="Pix, transferência, dinheiro..."
              {...register('payment_method')}
              aria-invalid={!!errors.payment_method}
            />
            {errors.payment_method && (
              <p className="text-destructive text-sm">{errors.payment_method.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="receive-payer-name" hint="Quem efetivamente pagou, se for diferente do cliente.">
              Pagador
            </FieldLabel>
            <Input id="receive-payer-name" {...register('payer_name')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="receive-receipt">Comprovante</FieldLabel>
            <Input
              id="receive-receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={receive.isPending}>
              {receive.isPending && <Loader2 className="animate-spin" />}
              Confirmar recebimento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
