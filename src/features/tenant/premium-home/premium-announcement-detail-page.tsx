import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Bath,
  BedDouble,
  BedSingle,
  Car,
  ChevronLeft,
  ChevronRight,
  LandPlot,
  Ruler,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { ThemeScopeProvider } from '@/lib/theme-scope'
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
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import { usePublicTenant } from '@/features/tenants/api'
import { PremiumHeader } from './premium-header'
import { PremiumFooter } from './premium-footer'
import { PremiumWhatsappFab } from './premium-whatsapp-fab'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FEATURE_FIELDS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'bedrooms', label: 'Quartos', icon: BedDouble },
  { key: 'suites', label: 'Suítes', icon: BedSingle },
  { key: 'bathrooms', label: 'Banheiros', icon: Bath },
  { key: 'parking_spaces', label: 'Vagas', icon: Car },
  { key: 'land_area', label: 'm² terreno', icon: LandPlot },
  { key: 'built_area', label: 'm² construídos', icon: Ruler },
]

/** Versão Premium do detalhe de anúncio — mesma fonte de dados da página
 * clássica (`PublicAnnouncementDetailPage`), layout novo: galeria full-bleed
 * com um card flutuante de preço/contato sobreposto, no mesmo espírito do
 * hero+busca da home Premium. */
export function PremiumAnnouncementDetailPage({ tenantSlug }: { tenantSlug: string }) {
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
  const [scopeEl, setScopeEl] = useState<HTMLDivElement | null>(null)

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
    return <FullscreenMessage title="Anúncio não encontrado" description="Esse imóvel pode não estar mais disponível." />
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
      ? amenityKeys.map((key) => amenitiesCatalog.find((a) => a.key === key)?.label).filter((l): l is string => !!l)
      : []

  const orderedBrokers = brokers
    ? [...brokers].sort((a, b) => {
        if (a.id === announcement.broker_id) return -1
        if (b.id === announcement.broker_id) return 1
        return 0
      })
    : []

  const features = FEATURE_FIELDS.filter((f) => announcement[f.key as keyof typeof announcement] != null)
  const galleryImages = images ?? []

  function openViewer(index: number) {
    setPhotoIndex(index)
    setViewerOpen(true)
  }

  function handleBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/')
  }

  return (
    <ThemeScopeProvider value={scopeEl}>
      <div
        ref={setScopeEl}
        className="bg-background text-foreground min-h-svh"
        style={tenantThemeVars(tenant, resolvedTheme)}
      >
        <PremiumHeader tenant={tenant} dark={dark} transparentOverHero={galleryImages.length > 0} />

        <main className={cn('flex flex-col gap-6 pb-16', galleryImages.length === 0 && 'pt-16')}>
          {galleryImages.length > 0 ? (
            <button
              type="button"
              onClick={() => openViewer(0)}
              className="relative block h-[46vh] min-h-72 w-full overflow-hidden sm:h-[56vh]"
            >
              <img
                src={announcementImageUrl(galleryImages[0].path)}
                alt={announcement.title}
                className="size-full object-cover"
              />
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-t via-black/0 to-black/0',
                  dark ? 'from-black/40' : 'from-black/70',
                )}
              />
              {galleryImages.length > 1 && (
                <span className="absolute right-4 bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  Ver todas as {galleryImages.length} fotos
                </span>
              )}
            </button>
          ) : (
            <div
              className="flex h-56 w-full items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
            >
              Sem fotos
            </div>
          )}

          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 sm:px-6">
            <button
              type="button"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-left text-sm"
            >
              ← Voltar aos anúncios
            </button>

            <div className={cn('relative z-10', galleryImages.length > 0 && '-mt-16 sm:-mt-20')}>
              <div className="bg-card ring-border flex flex-col gap-4 rounded-2xl p-6 shadow-xl ring-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{PROPERTY_TYPE_LABELS[announcement.property_type]}</Badge>
                    <Badge variant="outline">{TRANSACTION_TYPE_LABELS[announcement.transaction_type]}</Badge>
                    {announcement.featured && (
                      <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        Destaque
                      </Badge>
                    )}
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
                      <p className="text-primary text-xl font-semibold">
                        {formatPrice(announcement.promotional_price!)}
                      </p>
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
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <div className="flex flex-col gap-6">
                <Card>
                  <CardContent className="flex flex-col gap-4 pt-6">
                    {features.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {features.map(({ key, label, icon: Icon }) => (
                          <div key={key} className="bg-muted flex flex-col items-center gap-1 rounded-lg p-3 text-center">
                            <Icon className="text-primary size-4" />
                            <p className="text-lg font-semibold">{String(announcement[key as keyof typeof announcement])}</p>
                            <p className="text-muted-foreground text-xs">{label}</p>
                          </div>
                        ))}
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
                {galleryImages.length > 1 && (
                  <Card>
                    <CardContent className="flex flex-col gap-2 pt-6">
                      <h2 className="font-medium">Mais fotos</h2>
                      <div className="grid grid-cols-3 gap-2">
                        {galleryImages.slice(1).map((img, i) => (
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
                    </CardContent>
                  </Card>
                )}

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
        </main>

        <PremiumFooter tenant={tenant} />
        <PremiumWhatsappFab tenant={tenant} />

        {viewerOpen && galleryImages.length > 0 && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              className="absolute top-4 right-4 text-white/80 hover:text-white"
              aria-label="Fechar"
            >
              <X className="size-7" />
            </button>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white sm:left-6"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="size-10" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i + 1) % galleryImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white sm:right-6"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="size-10" />
                </button>
              </>
            )}

            <img
              src={announcementImageUrl(galleryImages[photoIndex].path)}
              alt=""
              className="max-h-[88vh] max-w-[88vw] object-contain"
            />

            {galleryImages.length > 1 && (
              <span className="absolute bottom-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {photoIndex + 1} / {galleryImages.length}
              </span>
            )}
          </div>
        )}
      </div>
    </ThemeScopeProvider>
  )
}
