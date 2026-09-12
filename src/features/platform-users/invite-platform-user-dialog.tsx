import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { PasswordRequirements } from '@/components/password-requirements'
import { errorMessage } from '@/lib/errors'
import { strongPasswordSchema } from '@/lib/password'
import { capitalizeName } from '@/lib/capitalize'
import { useInvitePlatformUser } from './api'

const schema = z.object({
  fullName: z.string().min(2, 'Informe o nome.'),
  email: z.email('E-mail inválido.'),
  password: strongPasswordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: 'As senhas não coincidem.', path: ['confirmPassword'] })

type FormValues = z.infer<typeof schema>
const emptyValues: FormValues = { fullName: '', email: '', password: '', confirmPassword: '' }

export function InvitePlatformUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const invite = useInvitePlatformUser()
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => { if (open) reset(emptyValues) }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      const user = await invite.mutateAsync({ email: values.email, password: values.password, full_name: values.fullName })
      toast.success(`Usuário criado: ${user.email}`)
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível criar o usuário', { description: errorMessage(error) })
    }
  }

  const nameField = register('fullName')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Novo usuário da plataforma</DialogTitle>
          <DialogDescription>Este usuário terá acesso completo ao Console PlaceHub.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Nome" htmlFor="platform-user-name" error={errors.fullName?.message}>
            <Input id="platform-user-name" {...nameField} onBlur={(event) => { nameField.onBlur(event); setValue('fullName', capitalizeName(event.target.value)) }} />
          </Field>
          <Field label="E-mail" htmlFor="platform-user-email" error={errors.email?.message}>
            <Input id="platform-user-email" type="email" {...register('email')} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Senha" htmlFor="platform-user-password" error={errors.password?.message}>
              <PasswordInput id="platform-user-password" autoComplete="new-password" {...register('password')} />
            </Field>
            <Field label="Confirmar senha" htmlFor="platform-user-confirm-password" error={errors.confirmPassword?.message}>
              <PasswordInput id="platform-user-confirm-password" autoComplete="new-password" {...register('confirmPassword')} />
            </Field>
          </div>
          <PasswordRequirements value={watch('password')} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={invite.isPending}>{invite.isPending && <Loader2 className="animate-spin" />}Criar usuário</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
