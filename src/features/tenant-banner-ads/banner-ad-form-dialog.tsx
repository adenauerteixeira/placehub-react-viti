import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Megaphone, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/field'
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
import {
  bannerAdImageUrl,
  useCreateBannerAd,
  useUpdateBannerAd,
  useUploadBannerAdImage,
  type BannerAd,
  type PaymentStatus,
} from './api'
import { PAYMENT_STATUS_LABELS } from './labels'

const schema = z
  .object({
    company_name: z.string().min(2, 'Informe a empresa anunciante.'),
    contact_name: z.string(),
    contact_email: z.union([z.literal(''), z.email('E-mail inválido.')]),
    contact_phone: z.string(),
    link_url: z.union([z.literal(''), z.url('Link inválido.')]),
    payment_status: z.enum(['pending', 'paid', 'overdue']),
    starts_at: z.string(),
    ends_at: z.string(),
  })
  .refine((v) => !v.starts_at || !v.ends_at || v.starts_at <= v.ends_at, {
    message: 'O fim da vigência precisa ser depois do início.',
    path: ['ends_at'],
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  link_url: '',
  payment_status: 'pending',
  starts_at: '',
  ends_at: '',
}

export function BannerAdFormDialog({
  open,
  onOpenChange,
  tenantId,
  ad,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  ad?: BannerAd
}) {
  const isEdit = !!ad
  const createAd = useCreateBannerAd(tenantId)
  const updateAd = useUpdateBannerAd(tenantId)
  const uploadImage = useUploadBannerAdImage(tenantId)
  const submitting = createAd.isPending || updateAd.isPending
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Imagem só pode ser enviada depois que o anúncio existe (o path usa o
  // id) — na criação, guardamos o registro recém-criado pra liberar o
  // upload sem precisar fechar e reabrir o dialog.
  const [justCreated, setJustCreated] = useState<BannerAd | null>(null)
  const activeAd = ad ?? justCreated

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
      ad
        ? {
            company_name: ad.company_name,
            contact_name: ad.contact_name ?? '',
            contact_email: ad.contact_email ?? '',
            contact_phone: ad.contact_phone ?? '',
            link_url: ad.link_url ?? '',
            payment_status: ad.payment_status,
            starts_at: ad.starts_at ?? '',
            ends_at: ad.ends_at ?? '',
          }
        : emptyValues,
    )
  }, [open, ad, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateAd.mutateAsync({ id: ad.id, ...values })
        toast.success('Anúncio atualizado.')
        onOpenChange(false)
      } else if (justCreated) {
        await updateAd.mutateAsync({ id: justCreated.id, ...values })
        toast.success('Anúncio atualizado.')
        onOpenChange(false)
      } else {
        const created = await createAd.mutateAsync(values)
        setJustCreated(created)
        toast.success('Anúncio criado. Envie uma imagem antes de fechar, se quiser.')
      }
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: errorMessage(error),
      })
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeAd) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande', { description: 'O limite é 5 MB.' })
      return
    }

    try {
      const path = await uploadImage.mutateAsync({ adId: activeAd.id, file })
      if (justCreated) setJustCreated({ ...justCreated, image_path: path })
      toast.success('Imagem atualizada.')
    } catch (error) {
      toast.error('Não foi possível enviar a imagem', {
        description: errorMessage(error),
      })
    }
  }

  const imageUrl = activeAd ? bannerAdImageUrl(activeAd.image_path, activeAd.updated_at) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar anúncio' : 'Novo anúncio'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Altere os dados do anúncio da empresa parceira.'
              : 'Cadastre uma empresa parceira pra aparecer no carrossel de banner da Vitrine.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
              {imageUrl ? (
                <img src={imageUrl} alt={activeAd?.company_name} className="size-full object-cover" />
              ) : (
                <Megaphone className="text-muted-foreground size-6" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!activeAd || uploadImage.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadImage.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              Enviar imagem
            </Button>
            {!activeAd && (
              <p className="text-muted-foreground text-xs">Salve o anúncio pra habilitar o envio.</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Tamanho recomendado: 1600 × 500px (bem larga), até 5 MB. A imagem preenche o slide
            inteiro (proporção livre, cobrindo toda a área), então evite texto ou informação
            importante perto das bordas.
          </p>

          <Field label="Empresa anunciante" htmlFor="ad-company" error={errors.company_name?.message}>
            <Input id="ad-company" {...register('company_name')} aria-invalid={!!errors.company_name} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contato (nome)" htmlFor="ad-contact-name">
              <Input id="ad-contact-name" {...register('contact_name')} />
            </Field>
            <Field label="Contato (telefone)" htmlFor="ad-contact-phone">
              <Input id="ad-contact-phone" {...register('contact_phone')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contato (e-mail)" htmlFor="ad-contact-email" error={errors.contact_email?.message}>
              <Input
                id="ad-contact-email"
                type="email"
                {...register('contact_email')}
                aria-invalid={!!errors.contact_email}
              />
            </Field>
            <Field
              label="Link do anúncio"
              htmlFor="ad-link"
              hint="Pra onde o clique no banner leva. Opcional."
              error={errors.link_url?.message}
            >
              <Input
                id="ad-link"
                placeholder="https://"
                {...register('link_url')}
                aria-invalid={!!errors.link_url}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Início da vigência"
              htmlFor="ad-starts-at"
              hint="Vazio = aparece desde já."
            >
              <Input id="ad-starts-at" type="date" className="w-full" {...register('starts_at')} />
            </Field>
            <Field
              label="Fim da vigência"
              htmlFor="ad-ends-at"
              hint="Vazio = sem data pra sair do ar."
              error={errors.ends_at?.message}
            >
              <Input
                id="ad-ends-at"
                type="date"
                className="w-full"
                {...register('ends_at')}
                aria-invalid={!!errors.ends_at}
              />
            </Field>
          </div>

          <Field label="Pagamento" htmlFor="ad-payment-status">
            <Select
              value={watch('payment_status')}
              onValueChange={(v) => setValue('payment_status', v as PaymentStatus)}
            >
              <SelectTrigger id="ad-payment-status" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit || justCreated ? 'Salvar' : 'Criar anúncio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
