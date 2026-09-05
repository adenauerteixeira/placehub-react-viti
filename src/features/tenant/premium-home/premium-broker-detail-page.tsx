import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { ThemeScopeProvider } from '@/lib/theme-scope'
import { whatsappUrl } from '@/lib/whatsapp'
import { announcementImageUrl, usePublicAnnouncementCovers, usePublicAnnouncements } from '@/features/announcements/api'
import { brokerPhotoUrl, usePublicBroker } from '@/features/brokers/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import { usePublicTenant } from '@/features/tenants/api'
import { PremiumAnnouncementCard } from './premium-announcement-card'
import { PremiumHeader } from './premium-header'
import { PremiumFooter } from './premium-footer'
import { PremiumWhatsappFab } from './premium-whatsapp-fab'
import { usePremiumFavorites } from './use-premium-favorites'

export function PremiumBrokerDetailPage({ tenantSlug }: { tenantSlug: string }) {
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
  const { isFavorite, toggle: toggleFavorite } = usePremiumFavorites(tenant?.id)
  const [scopeEl, setScopeEl] = useState<HTMLDivElement | null>(null)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')
  useTenantTitle(tenant?.name ?? null)

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
  const photoUrl = brokerPhotoUrl(broker.photo_path, broker.updated_at)

  return (
    <ThemeScopeProvider value={scopeEl}>
      <div
        ref={setScopeEl}
        className="bg-background text-foreground min-h-svh"
        style={tenantThemeVars(tenant, resolvedTheme)}
      >
        <PremiumHeader tenant={tenant} dark={dark} transparentOverHero={false} />

        <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pt-24 pb-16">
          <div className="ring-border flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-sm ring-1 sm:flex-row sm:text-left">
            <div className="bg-muted ring-primary/15 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full ring-4">
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
          </div>

          {brokerAnnouncements.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Anúncios de {broker.name}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {brokerAnnouncements.map((announcement) => {
                  const coverPath = covers?.[announcement.id]
                  return (
                    <PremiumAnnouncementCard
                      key={announcement.id}
                      announcement={announcement}
                      coverUrl={coverPath ? announcementImageUrl(coverPath) : null}
                      isFavorite={isFavorite(announcement.id)}
                      onToggleFavorite={() => toggleFavorite(announcement.id)}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </main>

        <PremiumFooter tenant={tenant} />
        <PremiumWhatsappFab tenant={tenant} />
      </div>
    </ThemeScopeProvider>
  )
}
