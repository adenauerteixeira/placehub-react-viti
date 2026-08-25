import { useEffect, useMemo } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/currency-input'
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
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import type { Proposal } from '@/features/proposals/api'
import { useCreateSaleFromProposal } from './api'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const installmentSchema = z.object({
  amount: z.number().nullable(),
  due_date: z.string(),
})

const assetSchema = z.object({
  description: z.string(),
  amount: z.number().nullable(),
  notes: z.string(),
})

const schema = z.object({
  down_payment_amount: z.number().nullable(),
  entry_installments: z.array(installmentSchema).max(6, 'No máximo 6 parcelas.'),
  payment_assets: z.array(assetSchema),
  financing_installments: z.string(),
  financing_source: z.string(),
  payment_notes: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  down_payment_amount: null,
  entry_installments: [],
  payment_assets: [],
  financing_installments: '',
  financing_source: '',
  payment_notes: '',
  notes: '',
}

export function SaleFormDialog({
  open,
  onOpenChange,
  proposal,
  reservationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal: Proposal
  reservationId?: string | null
}) {
  const createSale = useCreateSaleFromProposal(proposal.tenant_id)

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  const installments = useFieldArray({ control, name: 'entry_installments' })
  const assets = useFieldArray({ control, name: 'payment_assets' })

  useEffect(() => {
    if (open) reset(emptyValues)
  }, [open, reset])

  const watchedDownPayment = watch('down_payment_amount') ?? 0
  const watchedAssets = watch('payment_assets')
  const installmentsSum = watch('entry_installments').reduce((sum, i) => sum + (i.amount ?? 0), 0)
  const assetsSum = useMemo(
    () => watchedAssets.reduce((sum, a) => sum + (a.amount ?? 0), 0),
    [watchedAssets],
  )
  const financingPreview = Math.max(proposal.amount - watchedDownPayment - assetsSum, 0)

  async function onSubmit(values: FormValues) {
    if (values.entry_installments.length > 0 && Math.abs(installmentsSum - (values.down_payment_amount ?? 0)) > 0.01) {
      toast.error('A soma das parcelas de entrada precisa bater com o valor da entrada.')
      return
    }
    try {
      await createSale.mutateAsync({
        proposal_id: proposal.id,
        down_payment_amount: values.down_payment_amount ?? 0,
        entry_installments: values.entry_installments.map((i, idx) => ({
          number: idx + 1,
          amount: i.amount ?? 0,
          due_date: i.due_date,
        })),
        payment_assets: values.payment_assets.map((a) => ({
          description: a.description,
          amount: a.amount ?? 0,
          notes: a.notes,
        })),
        financing_installments: values.financing_installments ? Number(values.financing_installments) : null,
        financing_source: values.financing_source,
        payment_notes: values.payment_notes,
        notes: values.notes,
        reservation_id: reservationId ?? null,
      })
      toast.success('Venda registrada.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível fechar a venda', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Fechar venda</DialogTitle>
          <DialogDescription>
            Valor da venda: {formatPrice(proposal.amount)}
            {reservationId && ' — vinculada à reserva ativa deste anúncio.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="sale-down-payment">Entrada</FieldLabel>
              <Controller
                control={control}
                name="down_payment_amount"
                render={({ field }) => (
                  <CurrencyInput id="sale-down-payment" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="Calculado no servidor: valor da venda − entrada − bens dados como parte de pagamento.">
                Financiamento (estimado)
              </FieldLabel>
              <p className="text-muted-foreground flex h-9 items-center text-sm">
                {formatPrice(financingPreview)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FieldLabel hint="A soma das parcelas precisa bater com o valor da entrada. Até 6 parcelas.">
                Parcelas da entrada
              </FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={installments.fields.length >= 6}
                onClick={() => installments.append({ amount: null, due_date: '' })}
              >
                <Plus className="size-4" /> Parcela
              </Button>
            </div>
            {installments.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Valor</span>
                  <Controller
                    control={control}
                    name={`entry_installments.${index}.amount`}
                    render={({ field: f }) => <CurrencyInput value={f.value} onChange={f.onChange} />}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Vencimento</span>
                  <Input type="date" {...register(`entry_installments.${index}.due_date`)} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover parcela"
                  onClick={() => installments.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {installments.fields.length > 0 && (
              <p className="text-muted-foreground text-xs">
                Soma das parcelas: {formatPrice(installmentsSum)}
              </p>
            )}
            {errors.entry_installments && (
              <p className="text-destructive text-sm">{errors.entry_installments.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FieldLabel hint="Ex.: um imóvel ou veículo dado como parte do pagamento.">
                Bens dados como parte de pagamento
              </FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => assets.append({ description: '', amount: null, notes: '' })}
              >
                <Plus className="size-4" /> Bem
              </Button>
            </div>
            {assets.fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Descrição</span>
                  <Input {...register(`payment_assets.${index}.description`)} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">Valor</span>
                  <Controller
                    control={control}
                    name={`payment_assets.${index}.amount`}
                    render={({ field: f }) => <CurrencyInput value={f.value} onChange={f.onChange} />}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover bem"
                  onClick={() => assets.remove(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="sale-financing-installments">Parcelas do financiamento</FieldLabel>
              <Input id="sale-financing-installments" type="number" min="0" {...register('financing_installments')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="sale-financing-source">Instituição financiadora</FieldLabel>
              <Input id="sale-financing-source" {...register('financing_source')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="sale-payment-notes">Condições de pagamento</FieldLabel>
            <Textarea id="sale-payment-notes" rows={2} {...register('payment_notes')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="sale-notes">Observações</FieldLabel>
            <Textarea id="sale-notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createSale.isPending}>
              {createSale.isPending && <Loader2 className="animate-spin" />}
              Fechar venda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
