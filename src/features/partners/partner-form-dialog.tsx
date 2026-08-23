import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  partner?: Partner
}) {
  const isEdit = !!partner
  const createPartner = useCreatePartner(tenantId)
  const updatePartner = useUpdatePartner(tenantId)
  const submitting = createPartner.isPending || updatePartner.isPending

  const {
    register,
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
        await createPartner.mutateAsync(values)
        toast.success('Parceiro criado.')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(isEdit ? 'Não foi possível salvar' : 'Não foi possível criar', {
        description: errorMessage(error),
      })
    }
  }

  const personType = watch('person_type') as PersonType

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar parceiro' : 'Novo parceiro'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do parceiro.' : 'Cadastre uma imobiliária/pessoa parceira.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partner-name">Nome</Label>
              <Input id="partner-name" {...register('name')} aria-invalid={!!errors.name} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={personType} onValueChange={(v) => setValue('person_type', v as PersonType)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">PF</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partner-document">{personType === 'PF' ? 'CPF' : 'CNPJ'}</Label>
              <Input id="partner-document" {...register('document')} aria-invalid={!!errors.document} />
              {errors.document && (
                <p className="text-destructive text-sm">{errors.document.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partner-phone">Telefone</Label>
              <Input id="partner-phone" {...register('phone')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-email">E-mail</Label>
            <Input id="partner-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-notes">Observações</Label>
            <Textarea id="partner-notes" rows={3} {...register('notes')} />
          </div>

          <DialogFooter>
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
