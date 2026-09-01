import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentInput } from '@/components/document-input'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/phone-input'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/errors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { capitalizeName } from '@/lib/capitalize'
import { isValidDocument } from '@/lib/cpf-cnpj'
import { useCreatePartner, useUpdatePartner, type Partner, type PersonType } from './api'

const schema = z
  .object({
    name: z.string().min(2, 'Informe o nome.'),
    person_type: z.enum(['PF', 'PJ']),
    document: z.string(),
    phone: z.string(),
    email: z.union([z.literal(''), z.email('E-mail inválido.')]),
    notes: z.string(),
  })
  .refine((v) => isValidDocument(v.person_type, v.document), {
    message: 'Documento inválido.',
    path: ['document'],
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  name: '',
  person_type: 'PF',
  document: '',
  phone: '',
  email: '',
  notes: '',
}

export function PartnerFormDialog({
  open,
  onOpenChange,
  tenantId,
  partner,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  partner?: Partner
  onCreated?: (partner: Partner) => void
}) {
  const isEdit = !!partner
  const createPartner = useCreatePartner(tenantId)
  const updatePartner = useUpdatePartner(tenantId)
  const submitting = createPartner.isPending || updatePartner.isPending

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
      partner
        ? {
            name: partner.name,
            person_type: partner.person_type,
            document: partner.document ?? '',
            phone: partner.phone ?? '',
            email: partner.email ?? '',
            notes: partner.notes ?? '',
          }
        : emptyValues,
    )
  }, [open, partner, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updatePartner.mutateAsync({ id: partner.id, ...values })
        toast.success('Parceiro atualizado.')
      } else {
        const created = await createPartner.mutateAsync(values)
        toast.success('Parceiro criado.')
        onCreated?.(created)
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(isEdit ? 'Não foi possível salvar' : 'Não foi possível criar', {
        description: errorMessage(error),
      })
    }
  }

  const personType = watch('person_type') as PersonType
  const nameField = register('name')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar parceiro' : 'Novo parceiro'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do parceiro.' : 'Cadastre uma imobiliária/pessoa parceira.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <Field label="Nome" htmlFor="partner-name" error={errors.name?.message}>
              <Input
                id="partner-name"
                {...nameField}
                onBlur={(e) => {
                  nameField.onBlur(e)
                  setValue('name', capitalizeName(e.target.value))
                }}
                aria-invalid={!!errors.name}
              />
            </Field>
            <Field
              label="Tipo"
              htmlFor="partner-person-type"
              hint="Pessoa física ou jurídica — muda a validação do documento (CPF/CNPJ)."
            >
              <Select value={personType} onValueChange={(v) => setValue('person_type', v as PersonType)}>
                <SelectTrigger id="partner-person-type" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">PF</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label={personType === 'PF' ? 'CPF' : 'CNPJ'}
              htmlFor="partner-document"
              hint="Validado por dígito verificador — não é só checagem de tamanho."
              error={errors.document?.message}
            >
              <Controller
                control={control}
                name="document"
                render={({ field }) => (
                  <DocumentInput
                    id="partner-document"
                    personType={personType}
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={!!errors.document}
                  />
                )}
              />
            </Field>
            <Field label="Telefone" htmlFor="partner-phone">
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput id="partner-phone" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
          </div>

          <Field label="E-mail" htmlFor="partner-email" error={errors.email?.message}>
            <Input id="partner-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
          </Field>

          <Field
            label="Observações"
            htmlFor="partner-notes"
            hint="Anotações internas — não aparece em nenhum lugar público."
          >
            <Textarea id="partner-notes" rows={3} {...register('notes')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar parceiro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
