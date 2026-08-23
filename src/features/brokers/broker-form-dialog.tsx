import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  broker?: Broker
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
      }
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: error instanceof Error ? error.message : String(error),
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
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const photoUrl = activeBroker ? brokerPhotoUrl(activeBroker.photo_path, activeBroker.updated_at) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broker-name">Nome</Label>
            <Input id="broker-name" {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broker-phone">Telefone</Label>
              <Input id="broker-phone" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broker-email">E-mail</Label>
              <Input id="broker-email" type="email" {...register('email')} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broker-cpf">CPF</Label>
              <Input id="broker-cpf" {...register('cpf')} aria-invalid={!!errors.cpf} />
              {errors.cpf && <p className="text-destructive text-sm">{errors.cpf.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broker-creci">CRECI</Label>
              <Input id="broker-creci" className="w-28" {...register('creci')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>UF</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="broker-commission">Comissão (%)</Label>
              <Input
                id="broker-commission"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('commission_percentage')}
                aria-invalid={!!errors.commission_percentage}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Conta de login vinculada</Label>
              <Select value={watch('profile_id')} onValueChange={(v) => setValue('profile_id', v)}>
                <SelectTrigger>
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
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="broker-bio">Bio</Label>
            <Textarea id="broker-bio" rows={3} {...register('bio')} />
          </div>

          <DialogFooter>
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
