import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
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
import { BR_STATES } from '@/features/brokers/labels'
import { capitalizeName } from '@/lib/capitalize'
import { useInviteTenantUser } from './api'
import { PermissionCheckboxes } from './permission-checkboxes'
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AssignableRole } from './permissions'

const NONE = '__none__'

const schema = z
  .object({
    fullName: z.string(),
    email: z.email('E-mail inválido.'),
    password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
    confirmPassword: z.string(),
    role: z.enum(ASSIGNABLE_ROLES),
    creci: z.string(),
    creci_state: z.string(),
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
  creci: '',
  creci_state: NONE,
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
      const created = await invite.mutateAsync({
        ...values,
        full_name: values.fullName,
        creci_state: values.creci_state === NONE ? '' : values.creci_state,
        permissions,
      })
      toast.success(`Usuário criado: ${created.email}`)
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível criar o usuário', {
        description: errorMessage(error),
      })
    }
  }

  const nameField = register('fullName')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Cria um usuário nesta imobiliária, com papel e permissões.</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="invite-name">Nome</FieldLabel>
            <Input
              id="invite-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('fullName', capitalizeName(e.target.value))
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="invite-email" hint="Usado pra fazer login — precisa ser único na plataforma inteira.">
              E-mail
            </FieldLabel>
            <Input id="invite-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="invite-password">Senha</FieldLabel>
              <Input
                id="invite-password"
                type="password"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="invite-confirm-password">Confirmar senha</FieldLabel>
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

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="invite-creci" hint="Registro profissional, se este usuário for corretor. Opcional.">
                CRECI
              </FieldLabel>
              <Input id="invite-creci" {...register('creci')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>UF</FieldLabel>
              <Select value={watch('creci_state')} onValueChange={(v) => setValue('creci_state', v)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {BR_STATES.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel hint="Define o nível de acesso padrão — tenant_admin e manager veem tudo do módulo liberado; corretor só o que é dele.">
              Papel
            </FieldLabel>
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
            <FieldLabel hint="Módulos que este usuário pode acessar no menu — tenant_admin sempre vê tudo, independente do que estiver marcado aqui.">
              Permissões
            </FieldLabel>
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
