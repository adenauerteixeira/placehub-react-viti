import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Calculator, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/currency-input'
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useDevelopments, type Development } from '@/features/developments/api'
import { DevelopmentFormDialog } from '@/features/developments/development-form-dialog'
import { DEVELOPMENT_STATUS_LABELS } from '@/features/developments/labels'
import { usePartners, type Partner } from '@/features/partners/api'
import { PartnerFormDialog } from '@/features/partners/partner-form-dialog'
import { useOwners, type Owner } from '@/features/owners/api'
import { OwnerFormDialog } from '@/features/owners/owner-form-dialog'
import { useBrokers, type Broker } from '@/features/brokers/api'
import { BrokerFormDialog } from '@/features/brokers/broker-form-dialog'
import { BR_STATES } from '@/features/brokers/labels'
import { useTenantUsers } from '@/features/tenant-users/api'
import { errorMessage } from '@/lib/errors'
import { slugWithRandomSuffix } from '@/lib/slugify'
import { lookupCep } from '@/lib/viacep'
import { AgioCalculatorDialog } from './agio-calculator-dialog'
import { AmenityCheckboxes } from './amenity-checkboxes'
import { AnnouncementGallery } from './announcement-gallery'
import {
  useAnnouncement,
  useAnnouncementAmenities,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useSetAmenities,
  useUpdateAnnouncement,
  type AgioCalculation,
  type AnnouncementStatus,
  type PropertyType,
  type TransactionType,
} from './api'
import {
  ANNOUNCEMENT_STATUS_LABELS,
  ANNOUNCEMENT_STATUS_VARIANT,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from './labels'

const NONE = '__none__'
const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]
const TRANSACTION_TYPES = Object.keys(TRANSACTION_TYPE_LABELS) as TransactionType[]
const STATUSES = Object.keys(ANNOUNCEMENT_STATUS_LABELS) as AnnouncementStatus[]

const numericField = z.string().refine((v) => v === '' || !Number.isNaN(Number(v)), 'Número inválido.')

const schema = z
  .object({
    title: z.string().min(2, 'Informe o título.'),
    subtitle: z.string(),
    reference_code: z.string(),
    description: z.string(),
    property_type: z.enum(PROPERTY_TYPES as [PropertyType, ...PropertyType[]]),
    transaction_type: z.enum(TRANSACTION_TYPES as [TransactionType, ...TransactionType[]]),
    price: z
      .number()
      .nullable()
      .refine((v) => v != null && v > 0, 'Informe um preço válido.'),
    promotional_price: z.number().nullable(),
    featured: z.boolean(),
    promotion: z.boolean(),
    video_url: z.string(),
    zip_code: z.string(),
    street: z.string(),
    address_number: z.string(),
    complement: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    bedrooms: numericField,
    suites: numericField,
    bathrooms: numericField,
    parking_spaces: numericField,
    land_area: numericField,
    built_area: numericField,
    private_area: numericField,
    condominium_fee: z.number().nullable(),
    iptu: z.number().nullable(),
    development_id: z.string(),
    partner_id: z.string(),
    owner_id: z.string(),
    broker_id: z.string(),
    responsible_profile_id: z.string(),
  })
  .refine((v) => v.promotional_price == null || v.price == null || v.promotional_price <= v.price, {
    message: 'Deve ser menor ou igual ao preço.',
    path: ['promotional_price'],
  })

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  title: '',
  subtitle: '',
  reference_code: '',
  description: '',
  property_type: 'house',
  transaction_type: 'sale',
  price: null,
  promotional_price: null,
  featured: false,
  promotion: false,
  video_url: '',
  zip_code: '',
  street: '',
  address_number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: NONE,
  bedrooms: '',
  suites: '',
  bathrooms: '',
  parking_spaces: '',
  land_area: '',
  built_area: '',
  private_area: '',
  condominium_fee: null,
  iptu: null,
  development_id: NONE,
  partner_id: NONE,
  owner_id: NONE,
  broker_id: NONE,
  responsible_profile_id: NONE,
}

function num(value: string): number | null {
  return value === '' ? null : Number(value)
}

export function AnnouncementFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id && id !== 'novo'
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const [cepLoading, setCepLoading] = useState(false)
  const [agioDialogOpen, setAgioDialogOpen] = useState(false)
  const [agioData, setAgioData] = useState<AgioCalculation | null>(null)
  const [developmentDialogOpen, setDevelopmentDialogOpen] = useState(false)
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false)
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false)
  const [brokerDialogOpen, setBrokerDialogOpen] = useState(false)

  const { data: announcement, isLoading } = useAnnouncement(isEdit ? id : null)
  const { data: amenities } = useAnnouncementAmenities(isEdit ? id : null)
  const { data: developments } = useDevelopments(tenant.id)
  const { data: partners } = usePartners(tenant.id)
  const { data: owners } = useOwners(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const { data: tenantUsers } = useTenantUsers(tenant.id)

  const createAnnouncement = useCreateAnnouncement(tenant.id)
  const updateAnnouncement = useUpdateAnnouncement(tenant.id)
  const deleteAnnouncement = useDeleteAnnouncement(tenant.id)
  const setAmenities = useSetAmenities(id ?? '')
  const submitting = createAnnouncement.isPending || updateAnnouncement.isPending

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
    if (!announcement) return
    reset({
      title: announcement.title,
      subtitle: announcement.subtitle ?? '',
      reference_code: announcement.reference_code ?? '',
      description: announcement.description ?? '',
      property_type: announcement.property_type,
      transaction_type: announcement.transaction_type,
      price: announcement.price,
      promotional_price: announcement.promotional_price,
      featured: announcement.featured,
      promotion: announcement.promotion,
      video_url: announcement.video_url ?? '',
      zip_code: announcement.zip_code ?? '',
      street: announcement.street ?? '',
      address_number: announcement.address_number ?? '',
      complement: announcement.complement ?? '',
      neighborhood: announcement.neighborhood ?? '',
      city: announcement.city ?? '',
      state: announcement.state ?? NONE,
      bedrooms: announcement.bedrooms != null ? String(announcement.bedrooms) : '',
      suites: announcement.suites != null ? String(announcement.suites) : '',
      bathrooms: announcement.bathrooms != null ? String(announcement.bathrooms) : '',
      parking_spaces: announcement.parking_spaces != null ? String(announcement.parking_spaces) : '',
      land_area: announcement.land_area != null ? String(announcement.land_area) : '',
      built_area: announcement.built_area != null ? String(announcement.built_area) : '',
      private_area: announcement.private_area != null ? String(announcement.private_area) : '',
      condominium_fee: announcement.condominium_fee,
      iptu: announcement.iptu,
      development_id: announcement.development_id ?? NONE,
      partner_id: announcement.partner_id ?? NONE,
      owner_id: announcement.owner_id ?? NONE,
      broker_id: announcement.broker_id ?? NONE,
      responsible_profile_id: announcement.responsible_profile_id ?? NONE,
    })
    setAgioData(announcement.agio_calculation)
  }, [announcement, reset])

  function handlePropertyTypeChange(value: PropertyType) {
    setValue('property_type', value)
    if (value === 'assignment') setValue('transaction_type', 'sale')
  }

  function toInput(values: FormValues) {
    return {
      title: values.title,
      subtitle: values.subtitle,
      reference_code: values.reference_code,
      description: values.description,
      property_type: values.property_type,
      transaction_type: values.transaction_type,
      price: values.price ?? 0,
      promotional_price: values.promotional_price,
      featured: values.featured,
      promotion: values.promotion,
      video_url: values.video_url,
      zip_code: values.zip_code,
      street: values.street,
      address_number: values.address_number,
      complement: values.complement,
      neighborhood: values.neighborhood,
      city: values.city,
      state: values.state === NONE ? '' : values.state,
      bedrooms: num(values.bedrooms),
      suites: num(values.suites),
      bathrooms: num(values.bathrooms),
      parking_spaces: num(values.parking_spaces),
      land_area: num(values.land_area),
      built_area: num(values.built_area),
      private_area: num(values.private_area),
      condominium_fee: values.condominium_fee,
      iptu: values.iptu,
      development_id: values.development_id === NONE ? null : values.development_id,
      partner_id: values.partner_id === NONE ? null : values.partner_id,
      owner_id: values.owner_id === NONE ? null : values.owner_id,
      broker_id: values.broker_id === NONE ? null : values.broker_id,
      responsible_profile_id:
        values.responsible_profile_id === NONE ? null : values.responsible_profile_id,
      agio_calculation: agioData,
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateAnnouncement.mutateAsync({ id, ...toInput(values) })
        toast.success('Anúncio atualizado.')
      } else {
        await createAnnouncement.mutateAsync({
          ...toInput(values),
          slug: slugWithRandomSuffix(values.title),
        })
        toast.success('Anúncio criado como rascunho.')
      }
      navigate('/announcements')
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: errorMessage(error),
      })
    }
  }

  async function handleStatusChange(status: AnnouncementStatus) {
    if (!announcement) return
    try {
      await updateAnnouncement.mutateAsync({ id: announcement.id, status, ...toInput(watch()) })
      toast.success(`Status alterado para ${ANNOUNCEMENT_STATUS_LABELS[status]}.`)
    } catch (error) {
      toast.error('Não foi possível alterar o status', {
        description: errorMessage(error),
      })
    }
  }

  async function handleDelete() {
    if (!announcement) return
    if (!window.confirm('Excluir este anúncio? Essa ação não pode ser desfeita.')) return
    try {
      await deleteAnnouncement.mutateAsync(announcement.id)
      toast.success('Anúncio excluído.')
      navigate('/announcements')
    } catch (error) {
      toast.error('Não foi possível excluir', {
        description: errorMessage(error),
      })
    }
  }

  function handleBrokerCreated(broker: Broker) {
    setValue('broker_id', broker.id)
    if (broker.profile_id && watch('responsible_profile_id') === NONE) {
      setValue('responsible_profile_id', broker.profile_id)
    }
  }

  function handleBrokerChange(brokerId: string) {
    setValue('broker_id', brokerId)
    if (brokerId === NONE) return
    const broker = brokers?.find((b) => b.id === brokerId)
    if (broker?.profile_id && watch('responsible_profile_id') === NONE) {
      setValue('responsible_profile_id', broker.profile_id)
    }
  }

  async function handleCepBlur() {
    const cep = watch('zip_code')
    if (!cep) return
    setCepLoading(true)
    const result = await lookupCep(cep)
    setCepLoading(false)
    if (!result) {
      toast.error('CEP não encontrado')
      return
    }
    setValue('street', result.street)
    setValue('neighborhood', result.neighborhood)
    setValue('city', result.city)
    setValue('state', result.state)
  }

  if (isEdit && isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando…</p>
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/announcements" className="text-muted-foreground hover:text-foreground w-fit text-sm">
        ← Voltar
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{isEdit ? 'Editar anúncio' : 'Novo anúncio'}</h1>
          {announcement && (
            <Badge variant={ANNOUNCEMENT_STATUS_VARIANT[announcement.status]}>
              {ANNOUNCEMENT_STATUS_LABELS[announcement.status]}
            </Badge>
          )}
        </div>
        {announcement && (
          <div className="flex items-center gap-2">
            <Select value={announcement.status} onValueChange={(v) => handleStatusChange(v as AnnouncementStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ANNOUNCEMENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Dados básicos</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
            <TabsTrigger value="features">Características</TabsTrigger>
            <TabsTrigger value="amenities" disabled={!isEdit}>
              Amenidades
            </TabsTrigger>
            <TabsTrigger value="media" disabled={!isEdit}>
              Mídia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-title" hint="Nome do imóvel, como aparece na listagem e no anúncio público.">
                    Título
                  </FieldLabel>
                  <Input id="ann-title" {...register('title')} aria-invalid={!!errors.title} />
                  {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-subtitle" hint="Complementa o título — aparece em destaque na página pública do anúncio.">
                    Subtítulo
                  </FieldLabel>
                  <Input id="ann-subtitle" {...register('subtitle')} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel hint="Categoria usada pra agrupar os anúncios no portal público.">Tipo de imóvel</FieldLabel>
                    <div className="flex gap-1.5">
                      <Select
                        value={watch('property_type')}
                        onValueChange={(v) => handlePropertyTypeChange(v as PropertyType)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {PROPERTY_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {watch('property_type') === 'assignment' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Calculadora de ágio"
                          title="Calculadora de ágio"
                          onClick={() => setAgioDialogOpen(true)}
                        >
                          <Calculator className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel hint="Se o imóvel é pra vender ou alugar.">Transação</FieldLabel>
                    {watch('property_type') === 'assignment' ? (
                      <div className="border-input bg-input/30 text-muted-foreground flex h-8 items-center rounded-lg border px-2.5 text-sm">
                        Cessão é sempre Venda
                      </div>
                    ) : (
                      <Select
                        value={watch('transaction_type')}
                        onValueChange={(v) => setValue('transaction_type', v as TransactionType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSACTION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {TRANSACTION_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="ann-reference" hint="Código interno livre pra localizar o imóvel nos seus controles — não aparece pro visitante.">
                      Referência
                    </FieldLabel>
                    <Input id="ann-reference" {...register('reference_code')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="ann-price" hint="Valor de venda ou aluguel do imóvel.">Preço</FieldLabel>
                    <Controller
                      control={control}
                      name="price"
                      render={({ field }) => (
                        <CurrencyInput
                          id="ann-price"
                          value={field.value}
                          onChange={field.onChange}
                          aria-invalid={!!errors.price}
                        />
                      )}
                    />
                    {errors.price && <p className="text-destructive text-sm">{errors.price.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel
                      htmlFor="ann-promo-price"
                      hint="Se preenchido, aparece riscado ao lado do preço no portal público. Precisa ser menor ou igual ao preço."
                    >
                      Preço promocional
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="promotional_price"
                      render={({ field }) => (
                        <CurrencyInput
                          id="ann-promo-price"
                          value={field.value}
                          onChange={field.onChange}
                          aria-invalid={!!errors.promotional_price}
                        />
                      )}
                    />
                    {errors.promotional_price && (
                      <p className="text-destructive text-sm">{errors.promotional_price.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={watch('featured')}
                      onCheckedChange={(c) => setValue('featured', c === true)}
                    />
                    Destaque
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={watch('promotion')}
                      onCheckedChange={(c) => setValue('promotion', c === true)}
                    />
                    Promoção
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-description" hint="Texto livre exibido na página pública do anúncio.">
                    Descrição
                  </FieldLabel>
                  <Textarea id="ann-description" rows={4} {...register('description')} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel
                    htmlFor="ann-video"
                    hint="Link do YouTube, Vimeo ou um arquivo de vídeo direto (.mp4) — aparece embutido na página do anúncio."
                  >
                    Vídeo (YouTube/Vimeo ou link direto)
                  </FieldLabel>
                  <Input id="ann-video" {...register('video_url')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel hint="Empreendimento ao qual este imóvel pertence, se houver.">Empreendimento</FieldLabel>
                    <div className="flex gap-1.5">
                      <Select
                        value={watch('development_id')}
                        onValueChange={(v) => setValue('development_id', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Nenhum</SelectItem>
                          {developments?.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} ({DEVELOPMENT_STATUS_LABELS[d.status]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Novo empreendimento"
                        title="Novo empreendimento"
                        onClick={() => setDevelopmentDialogOpen(true)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel hint="Imobiliária ou pessoa parceira envolvida neste negócio, se houver.">Parceiro</FieldLabel>
                    <div className="flex gap-1.5">
                      <Select
                        value={watch('partner_id')}
                        onValueChange={(v) => setValue('partner_id', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Nenhum</SelectItem>
                          {partners?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Novo parceiro"
                        title="Novo parceiro"
                        onClick={() => setPartnerDialogOpen(true)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel hint="Dono do imóvel — informação interna, não aparece no anúncio público.">Proprietário</FieldLabel>
                    <div className="flex gap-1.5">
                      <Select
                        value={watch('owner_id')}
                        onValueChange={(v) => setValue('owner_id', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Nenhum</SelectItem>
                          {owners?.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Novo proprietário"
                        title="Novo proprietário"
                        onClick={() => setOwnerDialogOpen(true)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel hint="Corretor que aparece pro visitante como responsável pelo imóvel na página pública.">Corretor</FieldLabel>
                    <div className="flex gap-1.5">
                      <Select value={watch('broker_id')} onValueChange={handleBrokerChange}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Nenhum</SelectItem>
                          {brokers?.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Novo corretor"
                        title="Novo corretor"
                        onClick={() => setBrokerDialogOpen(true)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <FieldLabel hint="Quem gerencia este registro internamente — controla quem pode ver/editar quando o corretor não tem acesso total.">
                      Responsável interno
                    </FieldLabel>
                    <Select
                      value={watch('responsible_profile_id')}
                      onValueChange={(v) => setValue('responsible_profile_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Nenhum</SelectItem>
                        {tenantUsers?.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground text-xs">
                      Preenchido automaticamente ao escolher um corretor com login vinculado — pode
                      trocar se quiser.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address">
            <Card>
              <CardContent className="grid grid-cols-2 gap-4 pt-6">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-zip" hint="Preenche rua, bairro, cidade e UF automaticamente ao sair do campo.">
                    CEP
                  </FieldLabel>
                  <div className="relative">
                    <Input id="ann-zip" {...register('zip_code')} onBlur={handleCepBlur} />
                    {cepLoading && (
                      <Loader2 className="text-muted-foreground absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin" />
                    )}
                  </div>
                </div>
                <div />
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-street">Rua</FieldLabel>
                  <Input id="ann-street" {...register('street')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-number">Número</FieldLabel>
                  <Input id="ann-number" {...register('address_number')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-complement">Complemento</FieldLabel>
                  <Input id="ann-complement" {...register('complement')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-neighborhood">Bairro</FieldLabel>
                  <Input id="ann-neighborhood" {...register('neighborhood')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-city">Cidade</FieldLabel>
                  <Input id="ann-city" {...register('city')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>UF</FieldLabel>
                  <Select value={watch('state')} onValueChange={(v) => setValue('state', v)}>
                    <SelectTrigger>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardContent className="grid grid-cols-3 gap-4 pt-6">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-bedrooms">Quartos</FieldLabel>
                  <Input id="ann-bedrooms" type="number" {...register('bedrooms')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-suites" hint="Quartos com banheiro privativo — já contam dentro do total de quartos.">
                    Suítes
                  </FieldLabel>
                  <Input id="ann-suites" type="number" {...register('suites')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-bathrooms">Banheiros</FieldLabel>
                  <Input id="ann-bathrooms" type="number" {...register('bathrooms')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-parking">Vagas</FieldLabel>
                  <Input id="ann-parking" type="number" {...register('parking_spaces')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-land-area" hint="Área total do terreno/lote.">
                    Área do terreno (m²)
                  </FieldLabel>
                  <Input id="ann-land-area" type="number" step="0.01" {...register('land_area')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-built-area" hint="Área total construída, incluindo áreas comuns quando aplicável.">
                    Área construída (m²)
                  </FieldLabel>
                  <Input id="ann-built-area" type="number" step="0.01" {...register('built_area')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-private-area" hint="Área de uso exclusivo da unidade (sem áreas comuns).">
                    Área privativa (m²)
                  </FieldLabel>
                  <Input id="ann-private-area" type="number" step="0.01" {...register('private_area')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-condo-fee" hint="Valor mensal do condomínio.">
                    Condomínio
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="condominium_fee"
                    render={({ field }) => (
                      <CurrencyInput id="ann-condo-fee" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="ann-iptu" hint="Valor anual do IPTU.">
                    IPTU
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="iptu"
                    render={({ field }) => <CurrencyInput id="ann-iptu" value={field.value} onChange={field.onChange} />}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="amenities">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Amenidades</CardTitle>
              </CardHeader>
              <CardContent>
                <AmenityCheckboxes
                  selected={amenities ?? []}
                  onChange={(next) => setAmenities.mutate(next)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fotos</CardTitle>
              </CardHeader>
              <CardContent>
                {isEdit && <AnnouncementGallery announcementId={id} tenantId={tenant.id} />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar anúncio'}
          </Button>
        </div>
      </form>

      <AgioCalculatorDialog
        open={agioDialogOpen}
        onOpenChange={setAgioDialogOpen}
        data={agioData}
        onApply={(data, suggestedPrice) => {
          setAgioData(data)
          setValue('price', suggestedPrice)
        }}
      />
      <DevelopmentFormDialog
        open={developmentDialogOpen}
        onOpenChange={setDevelopmentDialogOpen}
        tenantId={tenant.id}
        onCreated={(d: Development) => setValue('development_id', d.id)}
      />
      <PartnerFormDialog
        open={partnerDialogOpen}
        onOpenChange={setPartnerDialogOpen}
        tenantId={tenant.id}
        onCreated={(p: Partner) => setValue('partner_id', p.id)}
      />
      <OwnerFormDialog
        open={ownerDialogOpen}
        onOpenChange={setOwnerDialogOpen}
        tenantId={tenant.id}
        onCreated={(o: Owner) => setValue('owner_id', o.id)}
      />
      <BrokerFormDialog
        open={brokerDialogOpen}
        onOpenChange={setBrokerDialogOpen}
        tenantId={tenant.id}
        onCreated={handleBrokerCreated}
      />
    </div>
  )
}
