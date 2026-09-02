import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentInput } from '@/components/document-input'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/phone-input'
import { Textarea } from '@/components/ui/textarea'
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
import { capitalizeName } from '@/lib/capitalize'
import { isValidCpf } from '@/lib/cpf-cnpj'
import { slugWithRandomSuffix } from '@/lib/slugify'
import {
  brokerPhotoUrl,
  useCreateBroker,
  useEligibleBrokerProfiles,
  useUpdateBroker,
  useUploadBrokerPhoto,
  type Broker,
} from './api'
import { BR_STATES } from './labels'

const NONE = '__none__'

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  profile_id: z.string(),
  phone: z.string(),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  cpf: z.string().refine((v) => !v || isValidCpf(v), 'CPF inválido.'),
  creci: z.string(),
  creci_state: z.string(),
  commission_percentage: z
    .string()
    .refine((v) => v !== '' && !Number.isNaN(Number(v)), 'Informe um número.')
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, 'Entre 0 e 100.'),
  bio: z.string(),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  name: '',
  profile_id: NONE,
  phone: '',
  email: '',
  cpf: '',
  creci: '',
  creci_state: NONE,
  commission_percentage: '2',
  bio: '',
}

export function BrokerFormDialog({
  open,
  onOpenChange,
  tenantId,
  broker,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  broker?: Broker
  onCreated?: (broker: Broker) => void
}) {
  const isEdit = !!broker
  const createBroker = useCreateBroker(tenantId)
  const updateBroker = useUpdateBroker(tenantId)
  const uploadPhoto = useUploadBrokerPhoto(tenantId)
  const submitting = createBroker.isPending || updateBroker.isPending
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Foto só pode ser enviada depois que o corretor existe (o path usa o
  // id) — na criação, guardamos o registro recém-criado aqui pra liberar o
  // upload sem precisar fechar e reabrir o dialog.
  const [justCreated, setJustCreated] = useState<Broker | null>(null)
  const activeBroker = broker ?? justCreated

  const { data: eligibleProfiles } = useEligibleBrokerProfiles(
    tenantId,
    activeBroker?.profile_id ?? null,
  )

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (!open) return
    setJustCreated(null)
    reset(
      broker
        ? {
            name: broker.name,
            profile_id: broker.profile_id ?? NONE,
            phone: broker.phone ?? '',
            email: broker.email ?? '',
            cpf: broker.cpf ?? '',
            creci: broker.creci ?? '',
            creci_state: broker.creci_state ?? NONE,
            commission_percentage: String(broker.commission_percentage),
            bio: broker.bio ?? '',
          }
        : emptyValues,
    )
  }, [open, broker, reset])

  async function onSubmit(values: FormValues) {
    const input = {
      ...values,
      profile_id: values.profile_id === NONE ? null : values.profile_id,
      creci_state: values.creci_state === NONE ? '' : values.creci_state,
      commission_percentage: Number(values.commission_percentage),
    }
    try {
      if (isEdit) {
        await updateBroker.mutateAsync({ id: broker.id, ...input })
        toast.success('Corretor atualizado.')
        onOpenChange(false)
      } else if (justCreated) {
        await updateBroker.mutateAsync({ id: justCreated.id, ...input })
        toast.success('Corretor atualizado.')
        onOpenChange(false)
      } else {
        const created = await createBroker.mutateAsync({
          ...input,
          slug: slugWithRandomSuffix(values.name),
        })
        setJustCreated(created)
        toast.success('Corretor criado. Envie uma foto antes de fechar, se quiser.')
        onCreated?.(created)
      }
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: errorMessage(error),
      })
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeBroker) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande', { description: 'O limite é 5 MB.' })
      return
    }

    try {
      const path = await uploadPhoto.mutateAsync({ brokerId: activeBroker.id, file })
      if (justCreated) setJustCreated({ ...justCreated, photo_path: path })
      toast.success('Foto atualizada.')
    } catch (error) {
      toast.error('Não foi possível enviar a foto', {
        description: errorMessage(error),
      })
    }
  }

  const photoUrl = activeBroker ? brokerPhotoUrl(activeBroker.photo_path, activeBroker.updated_at) : null
  const nameField = register('name')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar corretor' : 'Novo corretor'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Altere os dados do corretor.' : 'Cadastre um corretor da imobiliária.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border">
              {photoUrl ? (
                <img src={photoUrl} alt={activeBroker?.name} className="size-full object-cover" />
              ) : (
                <User className="text-muted-foreground size-6" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!activeBroker || uploadPhoto.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadPhoto.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              Enviar foto
            </Button>
            {!activeBroker && (
              <p className="text-muted-foreground text-xs">Salve o corretor pra habilitar o envio.</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <Field label="Nome" htmlFor="broker-name" error={errors.name?.message}>
            <Input
              id="broker-name"
              {...nameField}
              onBlur={(e) => {
                nameField.onBlur(e)
                setValue('name', capitalizeName(e.target.value))
              }}
              aria-invalid={!!errors.name}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Telefone"
              htmlFor="broker-phone"
              hint="Usado no botão de WhatsApp da página pública do corretor."
              error={errors.phone?.message}
            >
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneInput id="broker-phone" value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field label="E-mail" htmlFor="broker-email" error={errors.email?.message}>
              <Input id="broker-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            </Field>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-4">
            <Field
              label="CPF"
              htmlFor="broker-cpf"
              hint="Validado por dígito verificador — não é só checagem de tamanho."
              error={errors.cpf?.message}
            >
              <Controller
                control={control}
                name="cpf"
                render={({ field }) => (
                  <DocumentInput
                    id="broker-cpf"
                    personType="PF"
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={!!errors.cpf}
                  />
                )}
              />
            </Field>
            <Field
              label="CRECI"
              htmlFor="broker-creci"
              hint="Registro profissional do corretor — único por UF dentro da imobiliária."
            >
              <Input id="broker-creci" className="w-28" {...register('creci')} />
            </Field>
            <Field label="UF" htmlFor="broker-creci-state">
              <Select
                value={watch('creci_state')}
                onValueChange={(v) => setValue('creci_state', v)}
              >
                <SelectTrigger id="broker-creci-state" className="w-20">
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

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Comissão (%)"
              htmlFor="broker-commission"
              hint="Percentual usado como padrão no cálculo da comissão do corretor nas vendas (Fase 3)."
              error={errors.commission_percentage?.message}
            >
              <Input
                id="broker-commission"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('commission_percentage')}
                aria-invalid={!!errors.commission_percentage}
              />
            </Field>
            <Field
              label="Conta de login vinculada"
              htmlFor="broker-profile"
              hint="Vincula este corretor a uma conta de login existente (papel Corretor ou Gerente). Opcional."
            >
              <Select value={watch('profile_id')} onValueChange={(v) => setValue('profile_id', v)}>
                <SelectTrigger id="broker-profile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhuma</SelectItem>
                  {eligibleProfiles?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Bio" htmlFor="broker-bio" hint="Texto exibido na página pública do corretor.">
            <Textarea id="broker-bio" rows={3} {...register('bio')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit || justCreated ? 'Salvar' : 'Criar corretor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
