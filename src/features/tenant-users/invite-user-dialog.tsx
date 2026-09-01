import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { PasswordRequirements } from '@/components/password-requirements'
import { errorMessage } from '@/lib/errors'
import { strongPasswordSchema } from '@/lib/password'
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
    password: strongPasswordSchema,
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
          <Field label="Nome" htmlFor="invite-name">
            <Input
              id="invite-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('fullName', capitalizeName(e.target.value))
              }}
            />
          </Field>

          <Field
            label="E-mail"
            htmlFor="invite-email"
            hint="Usado pra fazer login — precisa ser único na plataforma inteira."
            error={errors.email?.message}
          >
            <Input id="invite-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Senha" htmlFor="invite-password" error={errors.password?.message}>
              <PasswordInput
                id="invite-password"
                autoComplete="new-password"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
            </Field>
            <Field
              label="Confirmar senha"
              htmlFor="invite-confirm-password"
              error={errors.confirmPassword?.message}
            >
              <PasswordInput
                id="invite-confirm-password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                aria-invalid={!!errors.confirmPassword}
              />
            </Field>
          </div>
          <PasswordRequirements value={watch('password')} />

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <Field
              label="CRECI"
              htmlFor="invite-creci"
              hint="Registro profissional, se este usuário for corretor. Opcional."
            >
              <Input id="invite-creci" {...register('creci')} />
            </Field>
            <Field label="UF" htmlFor="invite-creci-state">
              <Select value={watch('creci_state')} onValueChange={(v) => setValue('creci_state', v)}>
                <SelectTrigger id="invite-creci-state" className="w-20">
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
            </Field>
          </div>

          <Field
            label="Papel"
            htmlFor="invite-role"
            hint="Define o nível de acesso padrão — tenant_admin e manager veem tudo do módulo liberado; corretor só o que é dele."
          >
            <Select
              value={watch('role')}
              onValueChange={(value) => setValue('role', value as AssignableRole)}
            >
              <SelectTrigger id="invite-role">
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
          </Field>

          <Field
            label="Permissões"
            hint="Módulos que este usuário pode acessar no menu — tenant_admin sempre vê tudo, independente do que estiver marcado aqui."
          >
            <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
          </Field>

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
