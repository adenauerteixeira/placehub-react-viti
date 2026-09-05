import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Pause, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/field'
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
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PromoSlide } from '@/features/tenant/promo-slide'
import { ColorField } from '@/features/tenant-branding/color-field'
import {
  bannerAdImageUrl,
  isBannerAdExpired,
  useCreateBannerAd,
  useUpdateBannerAd,
  useUploadBannerAdImage,
  type BannerAd,
  type ImageAlign,
  type ImageFit,
  type PaymentStatus,
} from './api'
import { PAYMENT_STATUS_LABELS } from './labels'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

const schema = z
  .object({
    title: z.string(),
    subtitle: z.string(),
    subtitle_2: z.string(),
    link_label: z.string(),
    company_name: z.string().min(2, 'Informe a empresa anunciante.'),
    contact_name: z.string(),
    contact_email: z.union([z.literal(''), z.email('E-mail inválido.')]),
    contact_phone: z.string(),
    link_url: z.union([z.literal(''), z.url('Link inválido.')]),
    image_fit: z.enum(['cover', 'contain']),
    image_align: z.enum(['left', 'center', 'right']),
    background_color: z.string(),
    title_color: z.string(),
    subtitle_color: z.string(),
    subtitle_2_color: z.string(),
    badge_opacity: z.number(),
    overlay_color: z.string(),
    overlay_opacity: z.number(),
    border_color: z.string(),
    border_width: z.number(),
    display_seconds: z.string(),
    payment_status: z.enum(['pending', 'paid', 'overdue']),
    starts_at: z.string(),
    ends_at: z.string(),
    active: z.boolean(),
  })
  .refine((v) => !v.starts_at || !v.ends_at || v.starts_at <= v.ends_at, {
    message: 'O fim da vigência precisa ser depois do início.',
    path: ['ends_at'],
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  title: '',
  subtitle: '',
  subtitle_2: '',
  link_label: '',
  company_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  link_url: '',
  image_fit: 'cover',
  image_align: 'center',
  background_color: '#000000',
  title_color: '#ffffff',
  subtitle_color: '#ffffff',
  subtitle_2_color: '#ffffff',
  badge_opacity: 1,
  overlay_color: '#000000',
  overlay_opacity: 0.55,
  border_color: '#e5e7eb',
  border_width: 1,
  display_seconds: '',
  payment_status: 'pending',
  starts_at: '',
  ends_at: '',
  active: true,
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

  // Preview instantâneo: mostra a foto escolhida na hora via object URL
  // local, sem esperar o upload terminar — some sozinho assim que o anúncio
  // recarregado (invalidação da query) já reflete a foto nova.
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const localPreviewRef = useRef<string | null>(null)

  function setPreview(url: string | null) {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    localPreviewRef.current = url
    setLocalPreviewUrl(url)
  }

  useEffect(() => {
    setPreview(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAd?.image_path, activeAd?.updated_at])

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  const expired = isBannerAdExpired({ ends_at: watch('ends_at') || null })

  useEffect(() => {
    if (!open) return
    setJustCreated(null)
    setPreview(null)
    reset(
      ad
        ? {
            title: ad.title ?? '',
            subtitle: ad.subtitle ?? '',
            subtitle_2: ad.subtitle_2 ?? '',
            link_label: ad.link_label ?? '',
            company_name: ad.company_name,
            contact_name: ad.contact_name ?? '',
            contact_email: ad.contact_email ?? '',
            contact_phone: ad.contact_phone ?? '',
            link_url: ad.link_url ?? '',
            image_fit: ad.image_fit,
            image_align: ad.image_align,
            background_color: ad.background_color,
            title_color: ad.title_color,
            subtitle_color: ad.subtitle_color,
            subtitle_2_color: ad.subtitle_2_color,
            badge_opacity: ad.badge_opacity,
            overlay_color: ad.overlay_color,
            overlay_opacity: ad.overlay_opacity,
            border_color: ad.border_color,
            border_width: ad.border_width,
            display_seconds: ad.display_seconds?.toString() ?? '',
            payment_status: ad.payment_status,
            starts_at: ad.starts_at ?? '',
            ends_at: ad.ends_at ?? '',
            active: ad.active,
          }
        : emptyValues,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Arquivo muito grande', { description: 'O limite é 5 MB.' })
      return
    }

    setPreview(URL.createObjectURL(file))
    try {
      const path = await uploadImage.mutateAsync({ adId: activeAd.id, file })
      if (justCreated) setJustCreated({ ...justCreated, image_path: path })
      toast.success('Imagem atualizada.')
    } catch (error) {
      toast.error('Não foi possível enviar a imagem', {
        description: errorMessage(error),
      })
      setPreview(null)
    }
  }

  const previewImageUrl =
    localPreviewUrl ?? (activeAd ? bannerAdImageUrl(activeAd.image_path, activeAd.updated_at) : null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
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
          <div className="relative">
            <div className="pointer-events-none select-none">
              <PromoSlide
                imageUrl={previewImageUrl}
                title={watch('title') || watch('company_name') || 'Empresa anunciante'}
                subtitle={watch('subtitle')}
                subtitle2={watch('subtitle_2')}
                linkUrl={watch('link_url')}
                linkLabel={watch('link_label')}
                imageFit={watch('image_fit')}
                imageAlign={watch('image_align')}
                backgroundColor={watch('background_color')}
                titleColor={watch('title_color')}
                subtitleColor={watch('subtitle_color')}
                subtitle2Color={watch('subtitle_2_color')}
                overlayColor={watch('overlay_color')}
                overlayOpacity={watch('overlay_opacity')}
                borderColor={watch('border_color')}
                borderWidth={watch('border_width')}
                badgePosition="bottom"
                badge={
                  <span
                    className="rounded bg-black/50 px-2 py-1 text-xs text-white"
                    style={{ opacity: watch('badge_opacity') }}
                  >
                    Publicidade
                  </span>
                }
              />
              {/* Eco visual do botão de pausa do carrossel real (Vitrine
              Premium) — só pra mostrar onde o selo "Publicidade" vai
              acabar sobrando espaço ao lado; não é funcional aqui. */}
              <div
                aria-hidden="true"
                className="absolute right-[20px] bottom-[5px] flex size-7 items-center justify-center rounded-full border opacity-40"
              >
                <Pause className="size-3.5" />
              </div>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!activeAd || uploadImage.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadImage.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                Trocar foto
              </Button>
              {!activeAd && (
                <p className="text-muted-foreground text-xs">Salve o anúncio pra habilitar o envio.</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">
            Tamanho recomendado: 1600 × 500px (bem larga), até 5 MB.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Ajuste da imagem"
              htmlFor="ad-image-fit"
              hint="Preencher corta a imagem pra cobrir todo o slide. Ajustar mostra a imagem inteira, com uma faixa escura nas bordas se a proporção não bater."
            >
              <Select value={watch('image_fit')} onValueChange={(v) => setValue('image_fit', v as ImageFit)}>
                <SelectTrigger id="ad-image-fit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Preencher (cover)</SelectItem>
                  <SelectItem value="contain">Ajustar (contain)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Alinhamento da imagem"
              htmlFor="ad-image-align"
              hint="Pra onde a imagem encosta quando sobra espaço — mais perceptível com Ajustar (contain)."
            >
              <Select value={watch('image_align')} onValueChange={(v) => setValue('image_align', v as ImageAlign)}>
                <SelectTrigger id="ad-image-align" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border p-3">
            <ColorField
              label="Cor de fundo do slide"
              value={watch('background_color')}
              onChange={(v) => setValue('background_color', v)}
              compact
            />

            <div className="flex flex-col gap-1.5">
              <FieldLabel
                htmlFor="ad-badge-opacity"
                hint="Só desse anúncio — cada patrocinador pode ter uma opacidade de selo diferente."
              >
                Opacidade do selo "Publicidade"
              </FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  id="ad-badge-opacity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  className="accent-primary w-full"
                  value={watch('badge_opacity')}
                  onChange={(e) => setValue('badge_opacity', Number(e.target.value))}
                />
                <span className="text-muted-foreground w-10 shrink-0 text-right text-sm">
                  {Math.round(watch('badge_opacity') * 100)}%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel
                htmlFor="ad-overlay-opacity"
                hint="Filtro sobre a foto desse anúncio, pra manter o texto legível — ajuste conforme o brilho/cor da imagem."
              >
                Intensidade do filtro
              </FieldLabel>
              <div className="flex items-center gap-2">
                <input
                  id="ad-overlay-opacity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  className="accent-primary w-full"
                  value={watch('overlay_opacity')}
                  onChange={(e) => setValue('overlay_opacity', Number(e.target.value))}
                />
                <span className="text-muted-foreground w-10 shrink-0 text-right text-sm">
                  {Math.round(watch('overlay_opacity') * 100)}%
                </span>
              </div>
            </div>

            <ColorField
              label="Cor do filtro"
              value={watch('overlay_color')}
              onChange={(v) => setValue('overlay_color', v)}
              compact
            />

            <div className="flex items-end gap-4">
              <ColorField
                label="Cor da borda"
                value={watch('border_color')}
                onChange={(v) => setValue('border_color', v)}
                compact
              />
              <Field
                label="Espessura (px)"
                htmlFor="ad-border-width"
                hint='Espessura da borda — só aparece com "Mostrar borda ao redor do slide" ligado (Identidade Visual > Banner).'
                className="w-24"
              >
                <Input
                  id="ad-border-width"
                  type="number"
                  min={0}
                  max={20}
                  value={watch('border_width')}
                  onChange={(e) => setValue('border_width', Number(e.target.value))}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Field
              label="Título"
              htmlFor="ad-title"
              hint="Vazio usa o nome da empresa anunciante."
              className="flex-1"
            >
              <Input id="ad-title" {...register('title')} />
            </Field>
            <input
              type="color"
              aria-label="Cor do título"
              title="Cor do título"
              value={watch('title_color')}
              onChange={(e) => setValue('title_color', e.target.value)}
              className="border-input size-9 shrink-0 cursor-pointer rounded-md border p-0.5"
            />
          </div>

          <div className="flex items-end gap-2">
            <Field
              label="Subtítulo"
              htmlFor="ad-subtitle"
              hint="Opcional — só aparece se preenchido."
              className="flex-1"
            >
              <Input id="ad-subtitle" {...register('subtitle')} />
            </Field>
            <input
              type="color"
              aria-label="Cor do subtítulo"
              title="Cor do subtítulo"
              value={watch('subtitle_color')}
              onChange={(e) => setValue('subtitle_color', e.target.value)}
              className="border-input size-9 shrink-0 cursor-pointer rounded-md border p-0.5"
            />
          </div>

          <div className="flex items-end gap-2">
            <Field
              label="Segundo subtítulo"
              htmlFor="ad-subtitle-2"
              hint="Opcional — só aparece se preenchido."
              className="flex-1"
            >
              <Input id="ad-subtitle-2" {...register('subtitle_2')} />
            </Field>
            <input
              type="color"
              aria-label="Cor do segundo subtítulo"
              title="Cor do segundo subtítulo"
              value={watch('subtitle_2_color')}
              onChange={(e) => setValue('subtitle_2_color', e.target.value)}
              className="border-input size-9 shrink-0 cursor-pointer rounded-md border p-0.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Link do botão"
              htmlFor="ad-link"
              hint="Opcional. Mostra um botão nesse slide levando pra esse link."
              error={errors.link_url?.message}
            >
              <Input
                id="ad-link"
                placeholder="https://"
                {...register('link_url')}
                aria-invalid={!!errors.link_url}
              />
            </Field>
            <Field label="Rótulo do botão" htmlFor="ad-link-label" hint='Vazio usa "Saiba mais".'>
              <Input id="ad-link-label" placeholder="Saiba mais" {...register('link_label')} />
            </Field>
          </div>

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

          <Field label="Contato (e-mail)" htmlFor="ad-contact-email" error={errors.contact_email?.message}>
            <Input
              id="ad-contact-email"
              type="email"
              {...register('contact_email')}
              aria-invalid={!!errors.contact_email}
            />
          </Field>

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

          <div className="grid grid-cols-2 gap-4">
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
            <Field
              label="Duração do slide (segundos)"
              htmlFor="ad-display-seconds"
              hint="Vazio usa o padrão global (aba Banner > Exibição do carrossel)."
            >
              <Input
                id="ad-display-seconds"
                type="number"
                min={1}
                max={60}
                {...register('display_seconds')}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={expired ? false : watch('active')}
                disabled={expired}
                onCheckedChange={(c) => setValue('active', c)}
              />
              Ativo
            </label>
            {expired && (
              <p className="text-muted-foreground text-xs">
                Vigência encerrada — reative estendendo a data de fim.
              </p>
            )}
          </div>

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
