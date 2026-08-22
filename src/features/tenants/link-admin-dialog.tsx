import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import type { Tenant } from '@/features/tenants/api'

const schema = z
  .object({
    fullName: z.string(),
    email: z.email('E-mail inválido.'),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular administrador — {tenant.name}</DialogTitle>
          <DialogDescription>
            Cria um usuário já como tenant_admin desta imobiliária.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-name">Nome</Label>
            <Input id="admin-name" {...register('fullName')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">E-mail</Label>
            <Input id="admin-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-confirm-password">Confirmar senha</Label>
            <Input
              id="admin-confirm-password"
              type="password"
              {...register('confirmPassword')}
              aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>

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
