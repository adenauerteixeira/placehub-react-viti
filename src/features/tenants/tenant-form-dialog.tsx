import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/errors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { isReservedSlug, slugify, SLUG_PATTERN } from '@/lib/slugify'
import { useCreateTenant, useUpdateTenant, type Tenant } from '@/features/tenants/api'

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  slug: z
    .string()
    .regex(SLUG_PATTERN, 'Use letras minúsculas, números e hífen, sem começar/terminar com hífen.')
    .refine((s) => !isReservedSlug(s), 'Esse identificador é reservado pela plataforma.'),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  phone: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = { name: '', slug: '', email: '', phone: '' }

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant?: Tenant
  onCreated?: (tenant: Tenant) => void
}) {
  const isEdit = !!tenant
  const [slugEdited, setSlugEdited] = useState(isEdit)
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const submitting = createTenant.isPending || updateTenant.isPending

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
    setSlugEdited(isEdit)
    reset(
      tenant
        ? { name: tenant.name, slug: tenant.slug, email: tenant.email ?? '', phone: tenant.phone ?? '' }
        : emptyValues,
    )
  }, [open, tenant, isEdit, reset])

  const name = watch('name')
  useEffect(() => {
    if (!isEdit && !slugEdited) setValue('slug', slugify(name))
  }, [name, isEdit, slugEdited, setValue])

  function friendlyError(error: unknown): string {
    const message = errorMessage(error)
    if (message.includes('duplicate key') || message.includes('tenants_slug_key')) {
      return 'Esse identificador já está em uso por outra imobiliária.'
    }
    return message
  }

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateTenant.mutateAsync({ id: tenant.id, ...values })
        toast.success('Imobiliária atualizada.')
      } else {
        const created = await createTenant.mutateAsync(values)
        toast.success('Imobiliária criada.')
        onCreated?.(created)
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(isEdit ? 'Não foi possível salvar' : 'Não foi possível criar', {
        description: friendlyError(error),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar imobiliária' : 'Nova imobiliária'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Dados básicos da imobiliária. O subdomínio não pode ser alterado.'
              : 'O subdomínio não pode ser alterado depois de criado.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-name">Nome</Label>
            <Input id="tenant-name" {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-slug">Subdomínio</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="tenant-slug"
                disabled={isEdit}
                {...register('slug', { onChange: () => setSlugEdited(true) })}
                aria-invalid={!!errors.slug}
              />
              <span className="text-muted-foreground text-sm whitespace-nowrap">.placehub.app</span>
            </div>
            {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-email">E-mail de contato</Label>
            <Input id="tenant-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-phone">Telefone</Label>
            <Input id="tenant-phone" {...register('phone')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
