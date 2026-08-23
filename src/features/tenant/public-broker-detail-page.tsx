import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell, LogoBadge } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { whatsappUrl } from '@/lib/whatsapp'
import {
  announcementImageUrl,
  usePublicAnnouncementCovers,
  usePublicAnnouncements,
} from '@/features/announcements/api'
import { brokerPhotoUrl, usePublicBroker } from '@/features/brokers/api'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { usePublicTenant } from '@/features/tenants/api'
import { PublicAnnouncementCard } from './public-announcement-card'

export function PublicBrokerDetailPage({ tenantSlug }: { tenantSlug: string }) {
  const { slug } = useParams<{ slug: string }>()
  const { data: tenant, isLoading: tenantLoading } = usePublicTenant(tenantSlug)
  const { resolvedTheme } = useTheme()
  const { data: broker, isLoading: brokerLoading } = usePublicBroker(tenant?.id, slug)
  const { data: announcements } = usePublicAnnouncements(tenant?.id)
  const brokerAnnouncements = useMemo(
    () => announcements?.filter((a) => a.broker_id === broker?.id) ?? [],
    [announcements, broker],
  )
  const announcementIds = useMemo(() => brokerAnnouncements.map((a) => a.id), [brokerAnnouncements])
  const { data: covers } = usePublicAnnouncementCovers(announcementIds)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')

  if (tenantLoading || brokerLoading) return <FullscreenSpinner />
  if (!tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Confira o endereço ou fale com quem te enviou o link."
      />
    )
  }
  if (!broker) {
    return <FullscreenMessage title="Corretor não encontrado" description="Confira o endereço." />
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
  const photoUrl = brokerPhotoUrl(broker.photo_path, broker.updated_at)

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
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center sm:flex-row sm:text-left">
            <div className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full">
              {photoUrl ? (
                <img src={photoUrl} alt={broker.name} className="size-full object-cover" />
              ) : (
                <User className="text-muted-foreground size-10" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold">{broker.name}</h1>
              {broker.creci && (
                <p className="text-muted-foreground text-sm">
                  CRECI {broker.creci}
                  {broker.creci_state ? `/${broker.creci_state}` : ''}
                </p>
              )}
              {broker.bio && <p className="text-muted-foreground text-sm">{broker.bio}</p>}
              {broker.phone && (
                <Button asChild size="sm" className="mt-2 w-fit">
                  <a
                    href={whatsappUrl(broker.phone, `Olá ${broker.name}, vi seu perfil no site.`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Conversar pelo WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {brokerAnnouncements.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Anúncios de {broker.name}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brokerAnnouncements.map((announcement) => {
                const coverPath = covers?.[announcement.id]
                return (
                  <PublicAnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    coverUrl={coverPath ? announcementImageUrl(coverPath) : null}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
