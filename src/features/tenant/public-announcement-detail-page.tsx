import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell, LogoBadge } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
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
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { usePublicTenant } from '@/features/tenants/api'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: 'bedrooms', label: 'Quartos' },
  { key: 'suites', label: 'Suítes' },
  { key: 'bathrooms', label: 'Banheiros' },
  { key: 'parking_spaces', label: 'Vagas' },
]

export function PublicAnnouncementDetailPage({ tenantSlug }: { tenantSlug: string }) {
  const { slug } = useParams<{ slug: string }>()
  const { data: tenant, isLoading: tenantLoading } = usePublicTenant(tenantSlug)
  const { resolvedTheme } = useTheme()
  const { data: announcement, isLoading: announcementLoading } = usePublicAnnouncement(tenant?.id, slug)
  const { data: images } = useAnnouncementImages(announcement?.id)
  const { data: amenityKeys } = useAnnouncementAmenities(announcement?.id)
  const { data: amenitiesCatalog } = useAmenitiesCatalog()
  const { data: brokers } = usePublicBrokers(announcement ? tenant?.id : null)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')

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
  const logoPath = dark ? tenant.logo_dark_path : tenant.logo_light_path
  const logoUrl = brandingAssetUrl(logoPath, tenant.updated_at)
  const logoBackground = dark
    ? tenant.logo_dark_background_transparent
      ? 'transparent'
      : tenant.logo_dark_background_color
    : tenant.logo_light_background_transparent
      ? 'transparent'
      : tenant.logo_light_background_color

  const broker = brokers?.find((b) => b.id === announcement.broker_id)
  const contactPhone = broker?.phone || tenant.phone
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

  return (
    <AppShell
      style={tenantThemeVars(tenant, resolvedTheme)}
      header={
        <>
          {logoUrl ? (
            <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />
          ) : (
            <span className="text-lg font-semibold">{tenant.name}</span>
          )}
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
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {images && images.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted col-span-4 aspect-video overflow-hidden rounded-xl sm:col-span-3">
              <img
                src={announcementImageUrl(images[0].path)}
                alt={announcement.title}
                className="size-full object-cover"
              />
            </div>
            <div className="col-span-4 grid grid-cols-4 gap-2 sm:col-span-1 sm:grid-cols-1">
              {images.slice(1, 5).map((img) => (
                <div key={img.id} className="bg-muted aspect-square overflow-hidden rounded-lg">
                  <img src={announcementImageUrl(img.path)} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-xl text-sm">
            Sem fotos
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline">{PROPERTY_TYPE_LABELS[announcement.property_type]}</Badge>
                <Badge variant="outline">{TRANSACTION_TYPE_LABELS[announcement.transaction_type]}</Badge>
                {announcement.featured && <Badge>Destaque</Badge>}
              </div>
              <h1 className="text-2xl font-semibold">{announcement.title}</h1>
              {announcement.subtitle && <p className="text-muted-foreground">{announcement.subtitle}</p>}
              {address && <p className="text-muted-foreground text-sm">{address}</p>}
            </div>

            {(announcement.bedrooms || announcement.suites || announcement.bathrooms || announcement.parking_spaces) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {FEATURE_LABELS.map(
                  (f) =>
                    announcement[f.key as keyof typeof announcement] != null && (
                      <span key={f.key}>
                        <strong>{String(announcement[f.key as keyof typeof announcement])}</strong> {f.label}
                      </span>
                    ),
                )}
              </div>
            )}

            {announcement.description && (
              <p className="text-sm leading-relaxed whitespace-pre-line">{announcement.description}</p>
            )}

            {amenityLabels.length > 0 && (
              <div>
                <h2 className="mb-2 font-medium">Comodidades</h2>
                <div className="flex flex-wrap gap-2">
                  {amenityLabels.map((label) => (
                    <Badge key={label} variant="secondary">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {video && (
              <div>
                <h2 className="mb-2 font-medium">Vídeo</h2>
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
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                {hasPromo ? (
                  <div>
                    <p className="text-muted-foreground text-sm line-through">{formatPrice(announcement.price)}</p>
                    <p className="text-xl font-semibold">{formatPrice(announcement.promotional_price!)}</p>
                  </div>
                ) : (
                  <p className="text-xl font-semibold">{formatPrice(announcement.price)}</p>
                )}
                {announcement.reference_code && (
                  <p className="text-muted-foreground text-xs">Ref. {announcement.reference_code}</p>
                )}
                {contactPhone && (
                  <Button asChild>
                    <a
                      href={whatsappUrl(
                        contactPhone,
                        `Olá! Tenho interesse no imóvel "${announcement.title}" (${window.location.href}).`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Falar no WhatsApp
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {broker && (
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-full">
                    {broker.photo_path && (
                      <img
                        src={brokerPhotoUrl(broker.photo_path, broker.updated_at) ?? undefined}
                        alt={broker.name}
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <Link to={`/corretores/${broker.slug}`} className="font-medium hover:underline">
                      {broker.name}
                    </Link>
                    {broker.creci && (
                      <p className="text-muted-foreground text-xs">
                        CRECI {broker.creci}
                        {broker.creci_state ? `/${broker.creci_state}` : ''}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
