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
import type { PersonType } from '@/features/partners/api'
import { useCreateOwner, useUpdateOwner, type Owner } from './api'

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

export function OwnerFormDialog({
  open,
  onOpenChange,
  tenantId,
  owner,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  owner?: Owner
  onCreated?: (owner: Owner) => void
}) {
  const isEdit = !!owner
  const createOwner = useCreateOwner(tenantId)
  const updateOwner = useUpdateOwner(tenantId)
  const submitting = createOwner.isPending || updateOwner.isPending

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
      owner
        ? {
            name: owner.name,
            person_type: owner.person_type,
            document: owner.document ?? '',
            phone: owner.phone ?? '',
            email: owner.email ?? '',
            notes: owner.notes ?? '',
          }
        : emptyValues,
    )
  }, [open, owner, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateOwner.mutateAsync({ id: owner.id, ...values })
        toast.success('Proprietário atualizado.')
      } else {
        const created = await createOwner.mutateAsync(values)
        toast.success('Proprietário criado.')
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
          <DialogTitle>{isEdit ? 'Editar proprietário' : 'Novo proprietário'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Altere os dados do proprietário.'
              : 'Cadastre o dono de um imóvel a ser anunciado.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <Field label="Nome" htmlFor="owner-name" error={errors.name?.message}>
              <Input
                id="owner-name"
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
              htmlFor="owner-person-type"
              hint="Pessoa física ou jurídica — muda a validação do documento (CPF/CNPJ)."
            >
              <Select value={personType} onValueChange={(v) => setValue('person_type', v as PersonType)}>
                <SelectTrigger id="owner-person-type" className="w-24">
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
              htmlFor="owner-document"
              hint="Validado por dígito verificador — não é só checagem de tamanho."
              error={errors.document?.message}
            >
              <Controller
                control={control}
                name="document"
                render={({ field }) => (
                  <DocumentInput
                    id="owner-document"
                    personType={personType}
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={!!errors.document}
                  />
                )}
              />
            </Field>
            <Field label="Telefone" htmlFor="owner-phone">
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput id="owner-phone" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
          </div>

          <Field label="E-mail" htmlFor="owner-email" error={errors.email?.message}>
            <Input id="owner-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
          </Field>

          <Field
            label="Observações"
            htmlFor="owner-notes"
            hint="Anotações internas — não aparece em nenhum lugar público."
          >
            <Textarea id="owner-notes" rows={3} {...register('notes')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar proprietário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
