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
import { Switch } from '@/components/ui/switch'
import { useUpdateTenantUser, type TenantUser } from './api'
import { PermissionCheckboxes } from './permission-checkboxes'
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AssignableRole } from './permissions'

const schema = z.object({
  fullName: z.string(),
  phone: z.string(),
  creci: z.string(),
  role: z.enum(ASSIGNABLE_ROLES),
  isActive: z.boolean(),
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
  const [permissions, setPermissions] = useState<string[]>([])

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset({
      fullName: user.full_name ?? '',
      phone: user.phone ?? '',
      creci: user.creci ?? '',
      role: (user.role as AssignableRole) ?? 'broker',
      isActive: user.is_active,
    })
    setPermissions(user.profile_permissions.map((p) => p.permission_key))
  }, [open, user, reset])

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        id: user.id,
        full_name: values.fullName,
        phone: values.phone,
        creci: values.creci,
        role: values.role,
        is_active: values.isActive,
        permissions,
        currentPermissions: user.profile_permissions.map((p) => p.permission_key),
      })
      toast.success('Usuário atualizado.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-name">Nome</Label>
            <Input id="edit-user-name" {...register('fullName')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-user-phone">Telefone</Label>
              <Input id="edit-user-phone" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-user-creci">CRECI</Label>
              <Input id="edit-user-creci" {...register('creci')} />
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
            <Label>Permissões</Label>
            <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
