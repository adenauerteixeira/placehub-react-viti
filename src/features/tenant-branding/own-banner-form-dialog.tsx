import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errorMessage } from '@/lib/errors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Tenant } from '@/features/tenants/api'
import { PromoSlide } from '@/features/tenant/promo-slide'
import { ColorField } from './color-field'
import { brandingAssetUrl, useUpdateOwnBanner, useUploadBrandingAsset, type OwnBannerInput } from './api'

const MAX_SIZE_BYTES = 2 * 1024 * 1024

const schema = z.object({
  public_hero_title: z.string(),
  public_hero_subtitle: z.string(),
  public_hero_subtitle_2: z.string(),
  public_hero_link_url: z.union([z.literal(''), z.url('Link inválido.')]),
  public_hero_link_label: z.string(),
  public_hero_image_fit: z.enum(['cover', 'contain']),
  public_hero_image_align: z.enum(['left', 'center', 'right']),
  public_hero_background_color: z.string(),
  public_hero_display_seconds: z.string(),
})

type FormValues = z.infer<typeof schema>

function valuesFromTenant(tenant: Tenant): FormValues {
  return {
    public_hero_title: tenant.public_hero_title ?? '',
    public_hero_subtitle: tenant.public_hero_subtitle ?? '',
    public_hero_subtitle_2: tenant.public_hero_subtitle_2 ?? '',
    public_hero_link_url: tenant.public_hero_link_url ?? '',
    public_hero_link_label: tenant.public_hero_link_label ?? '',
    public_hero_image_fit: tenant.public_hero_image_fit,
    public_hero_image_align: tenant.public_hero_image_align,
    public_hero_background_color: tenant.public_hero_background_color,
    public_hero_display_seconds: tenant.public_hero_display_seconds?.toString() ?? '',
  }
}

export function OwnBannerFormDialog({
  open,
  onOpenChange,
  tenant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant
}) {
  const updateOwnBanner = useUpdateOwnBanner(tenant.id)
  const uploadAsset = useUploadBrandingAsset(tenant.id)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preview instantâneo: assim que uma foto é escolhida, mostra ela na hora
  // via object URL local, sem esperar o upload terminar. Some sozinho assim
  // que o `tenant` recarregado (invalidação da query) já reflete a foto
  // nova — evita tanto o "não aparece" quanto um possível flash pra foto
  // antiga entre o upload terminar e o refetch chegar.
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
  }, [tenant.background_image_path, tenant.updated_at])

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current)
    }
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesFromTenant(tenant) })

  useEffect(() => {
    if (open) reset(valuesFromTenant(tenant))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenant.id])

  async function onSubmit(values: FormValues) {
    try {
      await updateOwnBanner.mutateAsync(values as OwnBannerInput)
      toast.success('Banner próprio atualizado.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Não foi possível salvar', { description: errorMessage(error) })
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Arquivo muito grande', { description: 'O limite é 2 MB.' })
      return
    }

    setPreview(URL.createObjectURL(file))
    try {
      await uploadAsset.mutateAsync({ asset: 'background-image', file })
      toast.success('Foto do banner atualizada.')
    } catch (error) {
      toast.error('Não foi possível enviar a foto', { description: errorMessage(error) })
      setPreview(null)
    }
  }

  const previewImageUrl = localPreviewUrl ?? brandingAssetUrl(tenant.background_image_path, tenant.updated_at)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Editar Banner Próprio</DialogTitle>
          <DialogDescription>
            Foto, título e textos do slide da própria imobiliária — o que aparece antes dos
            anúncios de parceiros na Vitrine, e como banner único na Clássica.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="relative">
            <div className="pointer-events-none select-none">
              <PromoSlide
                imageUrl={previewImageUrl}
                title={watch('public_hero_title') || tenant.name}
                subtitle={
                  watch('public_hero_subtitle') || 'Encontre seu próximo imóvel com quem entende do mercado!'
                }
                subtitle2={watch('public_hero_subtitle_2')}
                linkUrl={watch('public_hero_link_url')}
                linkLabel={watch('public_hero_link_label')}
                imageFit={watch('public_hero_image_fit')}
                imageAlign={watch('public_hero_image_align')}
                backgroundColor={watch('public_hero_background_color')}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute right-3 bottom-3"
              disabled={uploadAsset.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadAsset.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              Trocar foto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Ajuste da imagem"
              htmlFor="own-hero-image-fit"
              hint="Preencher corta a imagem pra cobrir todo o slide. Ajustar mostra a imagem inteira, com uma faixa escura nas bordas se a proporção não bater."
            >
              <Select
                value={watch('public_hero_image_fit')}
                onValueChange={(v) => setValue('public_hero_image_fit', v as 'cover' | 'contain')}
              >
                <SelectTrigger id="own-hero-image-fit" className="w-full">
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
              htmlFor="own-hero-image-align"
              hint="Pra onde a imagem encosta quando sobra espaço — mais perceptível com Ajustar (contain)."
            >
              <Select
                value={watch('public_hero_image_align')}
                onValueChange={(v) => setValue('public_hero_image_align', v as 'left' | 'center' | 'right')}
              >
                <SelectTrigger id="own-hero-image-align" className="w-full">
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

          <ColorField
            label="Cor de fundo do slide"
            value={watch('public_hero_background_color')}
            onChange={(v) => setValue('public_hero_background_color', v)}
            eyedropper
            compact
          />

          <Field label="Título" htmlFor="own-hero-title" hint="Vazio usa o nome da imobiliária.">
            <Input id="own-hero-title" placeholder={tenant.name} {...register('public_hero_title')} />
          </Field>

          <Field label="Subtítulo" htmlFor="own-hero-subtitle" hint="Vazio usa a frase padrão.">
            <Input
              id="own-hero-subtitle"
              placeholder="Encontre seu próximo imóvel com quem entende do mercado!"
              {...register('public_hero_subtitle')}
            />
          </Field>

          <Field label="Segundo subtítulo" htmlFor="own-hero-subtitle-2" hint="Opcional — só aparece se preenchido.">
            <Input id="own-hero-subtitle-2" {...register('public_hero_subtitle_2')} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Link do botão"
              htmlFor="own-hero-link-url"
              hint="Opcional. Mostra um botão nesse slide levando pra esse link — pode ser uma página do próprio site (ex: /corretores) ou um endereço externo."
              error={errors.public_hero_link_url?.message}
            >
              <Input
                id="own-hero-link-url"
                placeholder="https:// ou /corretores"
                {...register('public_hero_link_url')}
                aria-invalid={!!errors.public_hero_link_url}
              />
            </Field>
            <Field label="Rótulo do botão" htmlFor="own-hero-link-label" hint='Vazio usa "Saiba mais".'>
              <Input id="own-hero-link-label" placeholder="Saiba mais" {...register('public_hero_link_label')} />
            </Field>
          </div>

          <Field
            label="Duração deste slide (segundos)"
            htmlFor="own-hero-display-seconds"
            hint="Vazio usa o padrão global (aba Banner > Exibição do carrossel). Só faz diferença na Vitrine, com mais de um slide girando."
          >
            <Input
              id="own-hero-display-seconds"
              type="number"
              min={1}
              max={60}
              className="w-24"
              {...register('public_hero_display_seconds')}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateOwnBanner.isPending}>
              {updateOwnBanner.isPending && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
