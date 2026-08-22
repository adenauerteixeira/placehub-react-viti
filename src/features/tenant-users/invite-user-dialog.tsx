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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInviteTenantUser } from './api'
import { PermissionCheckboxes } from './permission-checkboxes'
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AssignableRole } from './permissions'

const schema = z
  .object({
    fullName: z.string(),
    email: z.email('E-mail inválido.'),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
    confirmPassword: z.string(),
    role: z.enum(ASSIGNABLE_ROLES),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'broker',
}

export function InviteUserDialog({
  open,
  onOpenChange,
  tenantId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
}) {
  const invite = useInviteTenantUser(tenantId)
  const [permissions, setPermissions] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (open) {
      reset(emptyValues)
      setPermissions([])
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      const created = await invite.mutateAsync({ ...values, full_name: values.fullName, permissions })
      toast.success(`Usuário criado: ${created.email}`)
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível criar o usuário', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Cria um usuário nesta imobiliária, com papel e permissões.</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Nome</Label>
            <Input id="invite-name" {...register('fullName')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input id="invite-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-password">Senha</Label>
              <Input
                id="invite-password"
                type="password"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-confirm-password">Confirmar senha</Label>
              <Input
                id="invite-confirm-password"
                type="password"
                {...register('confirmPassword')}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Papel</Label>
            <Select
              value={watch('role')}
              onValueChange={(value) => setValue('role', value as AssignableRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Permissões</Label>
            <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending && <Loader2 className="animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
