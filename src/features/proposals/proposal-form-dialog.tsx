import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { errorMessage } from '@/lib/errors'
import { useCreateProposal, useUpdateProposal, type Proposal, type ProposalStatus } from './api'
import { PROPOSAL_STATUS_LABELS } from './labels'

const STATUSES = Object.keys(PROPOSAL_STATUS_LABELS) as ProposalStatus[]

const schema = z.object({
  amount: z
    .number()
    .nullable()
    .refine((v) => v != null && v > 0, 'Informe um valor válido.'),
  status: z.enum(STATUSES as [ProposalStatus, ...ProposalStatus[]]),
  valid_until: z.string(),
  payment_terms: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  amount: null,
  status: 'draft',
  valid_until: '',
  payment_terms: '',
  notes: '',
}

export function ProposalFormDialog({
  open,
  onOpenChange,
  negotiationId,
  proposal,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  negotiationId: string
  proposal?: Proposal
}) {
  const { tenant } = useTenantOutletContext()
  const isEdit = !!proposal
  const createProposal = useCreateProposal(negotiationId, tenant.id)
  const updateProposal = useUpdateProposal(negotiationId)
  const submitting = createProposal.isPending || updateProposal.isPending

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
    if (!open) return
    reset(
      proposal
        ? {
            amount: proposal.amount,
            status: proposal.status,
            valid_until: proposal.valid_until ?? '',
            payment_terms: proposal.payment_terms ?? '',
            notes: proposal.notes ?? '',
          }
        : emptyValues,
    )
  }, [open, proposal, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateProposal.mutateAsync({ id: proposal.id, ...values })
        toast.success('Proposta atualizada.')
      } else {
        await createProposal.mutateAsync(values)
        toast.success('Proposta criada.')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(isEdit ? 'Não foi possível salvar' : 'Não foi possível criar', {
        description: errorMessage(error),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar proposta' : 'Nova proposta'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados da proposta.' : 'Registre uma proposta para esta negociação.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor" htmlFor="proposal-amount" error={errors.amount?.message}>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <CurrencyInput
                    id="proposal-amount"
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={!!errors.amount}
                  />
                )}
              />
            </Field>
            <Field label="Status" htmlFor="proposal-status">
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as ProposalStatus)}>
                <SelectTrigger id="proposal-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {PROPOSAL_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Válida até"
            htmlFor="proposal-valid-until"
            hint="Depois dessa data, se ninguém agir, a proposta expira sozinha."
          >
            <Input id="proposal-valid-until" type="date" {...register('valid_until')} />
          </Field>

          <Field label="Condições de pagamento" htmlFor="proposal-payment-terms">
            <Textarea id="proposal-payment-terms" rows={2} {...register('payment_terms')} />
          </Field>

          <Field label="Observações" htmlFor="proposal-notes">
            <Textarea id="proposal-notes" rows={2} {...register('notes')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar proposta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
