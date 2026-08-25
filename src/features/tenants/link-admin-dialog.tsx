import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { PasswordRequirements } from '@/components/password-requirements'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { capitalizeName } from '@/lib/capitalize'
import { strongPasswordSchema } from '@/lib/password'
import { supabase } from '@/lib/supabase'
import type { Tenant } from '@/features/tenants/api'

const schema = z
  .object({
    fullName: z.string(),
    email: z.email('E-mail inválido.'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export function LinkAdminDialog({
  open,
  onOpenChange,
  tenant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant
}) {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (open) reset({ fullName: '', email: '', password: '', confirmPassword: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    const { data, error } = await supabase.functions.invoke('create-tenant-admin', {
      body: {
        tenant_id: tenant.id,
        email: values.email,
        password: values.password,
        full_name: values.fullName || null,
      },
    })
    setSubmitting(false)

    if (error) {
      let message = error.message
      try {
        const body = await error.context?.json()
        if (body?.error) message = body.error
      } catch {
        // resposta sem corpo JSON legível — mantém error.message
      }
      toast.error('Não foi possível criar o administrador', { description: message })
      return
    }

    toast.success(`Administrador criado: ${data.user.email}`)
    onOpenChange(false)
  }

  const nameField = register('fullName')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Vincular administrador — {tenant.name}</DialogTitle>
          <DialogDescription>
            Cria um usuário já como tenant_admin desta imobiliária.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="admin-name">Nome</FieldLabel>
            <Input
              id="admin-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('fullName', capitalizeName(e.target.value))
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="admin-email">E-mail</FieldLabel>
            <Input id="admin-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="admin-password">Senha</FieldLabel>
            <PasswordInput
              id="admin-password"
              autoComplete="new-password"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="admin-confirm-password">Confirmar senha</FieldLabel>
            <PasswordInput
              id="admin-confirm-password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>

          <PasswordRequirements value={watch('password')} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Criar administrador
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
