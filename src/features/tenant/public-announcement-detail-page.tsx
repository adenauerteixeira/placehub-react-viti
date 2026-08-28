import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, User, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { cn } from '@/lib/utils'
import { normalizeVideoUrl } from '@/lib/video-embed'
import { whatsappUrl } from '@/lib/whatsapp'
import {
  announcementImageUrl,
  useAmenitiesCatalog,
  useAnnouncementAmenities,
  useAnnouncementImages,
  usePublicAnnouncement,
} from '@/features/announcements/api'
import { PROPERTY_TYPE_LABELS, TRANSACTION_TYPE_LABELS } from '@/features/announcements/labels'
import { brokerPhotoUrl, usePublicBrokers } from '@/features/brokers/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import { usePublicTenant } from '@/features/tenants/api'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: 'bedrooms', label: 'Quartos' },
  { key: 'suites', label: 'Suítes' },
  { key: 'bathrooms', label: 'Banheiros' },
  { key: 'parking_spaces', label: 'Vagas' },
  { key: 'land_area', label: 'm² terreno' },
  { key: 'built_area', label: 'm² construídos' },
]

export function PublicAnnouncementDetailPage({ tenantSlug }: { tenantSlug: string }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: tenant, isLoading: tenantLoading } = usePublicTenant(tenantSlug)
  const { resolvedTheme } = useTheme()
  const { data: announcement, isLoading: announcementLoading } = usePublicAnnouncement(tenant?.id, slug)
  const { data: images } = useAnnouncementImages(announcement?.id)
  const { data: amenityKeys } = useAnnouncementAmenities(announcement?.id)
  const { data: amenitiesCatalog } = useAmenitiesCatalog()
  const { data: brokers } = usePublicBrokers(announcement ? tenant?.id : null)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')
  useTenantTitle(tenant?.name ?? null)

  useEffect(() => {
    if (!viewerOpen || !images || images.length === 0) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setViewerOpen(false)
      if (e.key === 'ArrowRight') setPhotoIndex((i) => (i + 1) % images!.length)
      if (e.key === 'ArrowLeft') setPhotoIndex((i) => (i - 1 + images!.length) % images!.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewerOpen, images])

  if (tenantLoading || announcementLoading) return <FullscreenSpinner />
  if (!tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Confira o endereço ou fale com quem te enviou o link."
      />
    )
  }
  if (!announcement) {
    return (
      <FullscreenMessage
        title="Anúncio não encontrado"
        description="Esse imóvel pode não estar mais disponível."
      />
    )
  }

  const dark = resolvedTheme === 'dark'
  const hasPromo = announcement.promotion && announcement.promotional_price != null
  const address = [
    announcement.street && announcement.address_number
      ? `${announcement.street}, ${announcement.address_number}`
      : announcement.street,
    announcement.neighborhood,
    announcement.city && announcement.state ? `${announcement.city}/${announcement.state}` : announcement.city,
  ]
    .filter(Boolean)
    .join(' — ')

  const video = announcement.video_url ? normalizeVideoUrl(announcement.video_url) : null
  const amenityLabels =
    amenityKeys && amenitiesCatalog
      ? amenityKeys
          .map((key) => amenitiesCatalog.find((a) => a.key === key)?.label)
          .filter((label): label is string => !!label)
      : []

  const orderedBrokers = brokers
    ? [...brokers].sort((a, b) => {
        if (a.id === announcement.broker_id) return -1
        if (b.id === announcement.broker_id) return 1
        return 0
      })
    : []

  function openViewer(index: number) {
    setPhotoIndex(index)
    setViewerOpen(true)
  }

  // location.key === 'default' significa que a página foi aberta direto
  // (URL colada/refresh), sem histórico de navegação do app pra voltar —
  // nesse caso navigate(-1) sairia do site. Com histórico, volta de fato
  // (preserva a posição de rolagem da home, igual ao botão voltar do
  // navegador), em vez de sempre reabrir a home do zero no topo.
  function handleBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/')
  }

  return (
    <AppShell
      style={tenantThemeVars(tenant, resolvedTheme)}
      header={
        <>
          <TenantBrand tenant={tenant} dark={dark} />
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
              Anúncios
            </Link>
            <Link to="/corretores" className="text-muted-foreground hover:text-foreground text-sm">
              Corretores
            </Link>
            <ThemeToggle />
          </div>
        </>
      }
      footer={<AppFooter>{tenant.name} · Plataforma PlaceHub</AppFooter>}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-left text-sm"
        >
          ← Voltar aos anúncios
        </button>

        <header className="bg-card flex flex-col gap-4 rounded-2xl border p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{PROPERTY_TYPE_LABELS[announcement.property_type]}</Badge>
              <Badge variant="outline">{TRANSACTION_TYPE_LABELS[announcement.transaction_type]}</Badge>
              {announcement.featured && <Badge>Destaque</Badge>}
              {hasPromo && <Badge variant="secondary">Promoção</Badge>}
            </div>
            <h1 className="text-2xl font-semibold">{announcement.title}</h1>
            {announcement.subtitle && <p className="text-muted-foreground">{announcement.subtitle}</p>}
            {address && <p className="text-muted-foreground text-sm">{address}</p>}
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {hasPromo ? (
              <div className="sm:text-right">
                <p className="text-muted-foreground text-sm line-through">{formatPrice(announcement.price)}</p>
                <p className="text-xl font-semibold">{formatPrice(announcement.promotional_price!)}</p>
              </div>
            ) : (
              <p className="text-xl font-semibold">{formatPrice(announcement.price)}</p>
            )}
            {(announcement.condominium_fee != null || announcement.iptu != null) && (
              <div className="text-muted-foreground text-xs sm:text-right">
                {announcement.condominium_fee != null && (
                  <p>Condomínio: {formatPrice(announcement.condominium_fee)}</p>
                )}
                {announcement.iptu != null && <p>IPTU: {formatPrice(announcement.iptu)}</p>}
              </div>
            )}
            {announcement.reference_code && (
              <p className="text-muted-foreground text-xs">Ref. {announcement.reference_code}</p>
            )}
            {orderedBrokers.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button>Falar com um corretor</Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="flex w-72 flex-col gap-1 p-2">
                  {orderedBrokers.map((broker) => (
                    <a
                      key={broker.id}
                      href={
                        broker.phone
                          ? whatsappUrl(
                              broker.phone,
                              `Olá! Tenho interesse no imóvel "${announcement.title}" (${window.location.href}).`,
                            )
                          : undefined
                      }
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        'hover:bg-accent flex items-center gap-2 rounded-lg p-2 text-left',
                        !broker.phone && 'pointer-events-none opacity-60',
                      )}
                    >
                      <div className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
                        {broker.photo_path ? (
                          <img
                            src={brokerPhotoUrl(broker.photo_path, broker.updated_at) ?? undefined}
                            alt={broker.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <User className="text-muted-foreground size-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{broker.name}</p>
                        {broker.creci && (
                          <p className="text-muted-foreground text-xs">
                            CRECI {broker.creci}
                            {broker.creci_state ? `/${broker.creci_state}` : ''}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                {FEATURE_LABELS.some((f) => announcement[f.key as keyof typeof announcement] != null) && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {FEATURE_LABELS.map(
                      (f) =>
                        announcement[f.key as keyof typeof announcement] != null && (
                          <div key={f.key} className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-lg font-semibold">
                              {String(announcement[f.key as keyof typeof announcement])}
                            </p>
                            <p className="text-muted-foreground text-xs">{f.label}</p>
                          </div>
                        ),
                    )}
                  </div>
                )}
                {announcement.description && (
                  <p className="text-sm leading-relaxed whitespace-pre-line">{announcement.description}</p>
                )}
              </CardContent>
            </Card>

            {amenityLabels.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="mb-3 font-medium">Características e comodidades</h2>
                  <div className="flex flex-wrap gap-2">
                    {amenityLabels.map((label) => (
                      <span key={label} className="rounded-full border px-3 py-1.5 text-sm">
                        {label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-2 pt-6">
                <h2 className="font-medium">Fotos</h2>
                {images && images.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openViewer(0)}
                      className="bg-muted block aspect-[16/10] w-full overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
                    >
                      <img
                        src={announcementImageUrl(images[0].path)}
                        alt={announcement.title}
                        className="size-full object-cover"
                      />
                    </button>
                    {images.length > 1 && (
                      <div className="grid grid-cols-3 gap-2">
                        {images.slice(1).map((img, i) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => openViewer(i + 1)}
                            className="bg-muted aspect-[4/3] overflow-hidden rounded-lg transition-transform hover:scale-105"
                          >
                            <img src={announcementImageUrl(img.path)} alt="" className="size-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-muted text-muted-foreground flex aspect-[16/10] items-center justify-center rounded-xl text-sm">
                    Sem fotos
                  </div>
                )}
              </CardContent>
            </Card>

            {video && (
              <Card>
                <CardContent className="flex flex-col gap-2 pt-6">
                  <h2 className="font-medium">Vídeo</h2>
                  {video.kind === 'youtube' || video.kind === 'vimeo' ? (
                    <div className="aspect-video overflow-hidden rounded-xl">
                      <iframe
                        src={video.url}
                        className="size-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        title="Vídeo do imóvel"
                      />
                    </div>
                  ) : video.kind === 'file' ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={video.url} controls className="w-full rounded-xl" />
                  ) : (
                    <a href={video.url} target="_blank" rel="noreferrer" className="text-primary underline">
                      Assistir vídeo
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      {viewerOpen && images && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="Fechar"
          >
            <X className="size-7" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPhotoIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white sm:left-6"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="size-10" />
              </button>
              <button
                type="button"
                onClick={() => setPhotoIndex((i) => (i + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white sm:right-6"
                aria-label="Próxima foto"
              >
                <ChevronRight className="size-10" />
              </button>
            </>
          )}

          <img
            src={announcementImageUrl(images[photoIndex].path)}
            alt=""
            className="max-h-[88vh] max-w-[88vw] object-contain"
          />

          {images.length > 1 && (
            <span className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {photoIndex + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </AppShell>
  )
}
