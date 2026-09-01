import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { PasswordRequirements } from '@/components/password-requirements'
import { PhoneInput } from '@/components/phone-input'
import { errorMessage } from '@/lib/errors'
import { isStrongPassword } from '@/lib/password'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { BR_STATES } from '@/features/brokers/labels'
import { capitalizeName } from '@/lib/capitalize'
import {
  useResetTenantUserPassword,
  useUpdateTenantUser,
  useUpdateTenantUserEmail,
  type TenantUser,
} from './api'
import { PermissionCheckboxes } from './permission-checkboxes'
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AssignableRole } from './permissions'

const NONE = '__none__'

const schema = z
  .object({
    fullName: z.string(),
    email: z.email('E-mail inválido.'),
    phone: z.string(),
    creci: z.string(),
    creci_state: z.string(),
    role: z.enum(ASSIGNABLE_ROLES),
    isActive: z.boolean(),
    newPassword: z.string(),
    confirmNewPassword: z.string(),
  })
  .refine((v) => v.newPassword === '' || isStrongPassword(v.newPassword), {
    message: 'A senha não atende aos requisitos mínimos.',
    path: ['newPassword'],
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmNewPassword'],
  })

type FormValues = z.infer<typeof schema>

export function EditUserDialog({
  open,
  onOpenChange,
  tenantId,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  user: TenantUser
}) {
  const update = useUpdateTenantUser(tenantId)
  const updateEmail = useUpdateTenantUserEmail(tenantId)
  const resetPassword = useResetTenantUserPassword()
  const [permissions, setPermissions] = useState<string[]>([])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset({
      fullName: user.full_name ?? '',
      email: user.email,
      phone: user.phone ?? '',
      creci: user.creci ?? '',
      creci_state: user.creci_state ?? NONE,
      role: (user.role as AssignableRole) ?? 'broker',
      isActive: user.is_active,
      newPassword: '',
      confirmNewPassword: '',
    })
    setPermissions(user.profile_permissions.map((p) => p.permission_key))
  }, [open, user, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (values.email !== user.email) {
        await updateEmail.mutateAsync({ user_id: user.id, email: values.email })
      }
      if (values.newPassword !== '') {
        await resetPassword.mutateAsync({ user_id: user.id, password: values.newPassword })
      }
      await update.mutateAsync({
        id: user.id,
        full_name: values.fullName,
        phone: values.phone,
        creci: values.creci,
        creci_state: values.creci_state === NONE ? '' : values.creci_state,
        role: values.role,
        is_active: values.isActive,
        permissions,
        currentPermissions: user.profile_permissions.map((p) => p.permission_key),
      })
      toast.success('Usuário atualizado.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: errorMessage(error),
      })
    }
  }

  const nameField = register('fullName')
  const submitting = update.isPending || updateEmail.isPending || resetPassword.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Nome" htmlFor="edit-user-name">
            <Input
              id="edit-user-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('fullName', capitalizeName(e.target.value))
              }}
            />
          </Field>

          <Field
            label="E-mail"
            htmlFor="edit-user-email"
            hint="Usado pra fazer login — precisa ser único na plataforma inteira."
            error={errors.email?.message}
          >
            <Input id="edit-user-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Nova senha"
              htmlFor="edit-user-new-password"
              hint="Deixe em branco pra manter a senha atual. Preencha só se o usuário esqueceu a senha e precisa de uma nova."
              error={errors.newPassword?.message}
            >
              <PasswordInput
                id="edit-user-new-password"
                autoComplete="new-password"
                {...register('newPassword')}
                aria-invalid={!!errors.newPassword}
              />
            </Field>
            <Field
              label="Confirmar nova senha"
              htmlFor="edit-user-confirm-new-password"
              error={errors.confirmNewPassword?.message}
            >
              <PasswordInput
                id="edit-user-confirm-new-password"
                autoComplete="new-password"
                {...register('confirmNewPassword')}
                aria-invalid={!!errors.confirmNewPassword}
              />
            </Field>
          </div>
          {watch('newPassword') !== '' && <PasswordRequirements value={watch('newPassword')} />}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefone" htmlFor="edit-user-phone">
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput id="edit-user-phone" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field
                label="CRECI"
                htmlFor="edit-user-creci"
                hint="Registro profissional, se este usuário for corretor."
              >
                <Input id="edit-user-creci" {...register('creci')} />
              </Field>
              <Field label="UF" htmlFor="edit-user-creci-state">
                <Select
                  value={watch('creci_state')}
                  onValueChange={(v) => setValue('creci_state', v)}
                >
                  <SelectTrigger id="edit-user-creci-state" className="w-20">
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
          </div>

          <Field
            label="Papel"
            htmlFor="edit-user-role"
            hint="Define o nível de acesso padrão — tenant_admin e manager veem tudo do módulo liberado; corretor só o que é dele."
          >
            <Select
              value={watch('role')}
              onValueChange={(value) => setValue('role', value as AssignableRole)}
            >
              <SelectTrigger id="edit-user-role">
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

          <div className="flex items-center gap-2">
            <Switch
              id="edit-user-active"
              checked={watch('isActive')}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
            <Label htmlFor="edit-user-active" className="font-normal">
              Usuário ativo
            </Label>
          </div>

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
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
