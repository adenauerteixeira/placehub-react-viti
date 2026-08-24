import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/phone-input'
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
  .refine((v) => v.newPassword === '' || v.newPassword.length >= 8, {
    message: 'A senha precisa ter pelo menos 8 caracteres.',
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
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="edit-user-name">Nome</FieldLabel>
            <Input
              id="edit-user-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('fullName', capitalizeName(e.target.value))
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="edit-user-email" hint="Usado pra fazer login — precisa ser único na plataforma inteira.">
              E-mail
            </FieldLabel>
            <Input id="edit-user-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="edit-user-new-password" hint="Deixe em branco pra manter a senha atual. Preencha só se o usuário esqueceu a senha e precisa de uma nova.">
                Nova senha
              </FieldLabel>
              <Input
                id="edit-user-new-password"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
                aria-invalid={!!errors.newPassword}
              />
              {errors.newPassword && <p className="text-destructive text-sm">{errors.newPassword.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="edit-user-confirm-new-password">Confirmar nova senha</FieldLabel>
              <Input
                id="edit-user-confirm-new-password"
                type="password"
                autoComplete="new-password"
                {...register('confirmNewPassword')}
                aria-invalid={!!errors.confirmNewPassword}
              />
              {errors.confirmNewPassword && (
                <p className="text-destructive text-sm">{errors.confirmNewPassword.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="edit-user-phone">Telefone</FieldLabel>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput id="edit-user-phone" value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="edit-user-creci" hint="Registro profissional, se este usuário for corretor.">
                  CRECI
                </FieldLabel>
                <Input id="edit-user-creci" {...register('creci')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>UF</FieldLabel>
                <Select
                  value={watch('creci_state')}
                  onValueChange={(v) => setValue('creci_state', v)}
                >
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
