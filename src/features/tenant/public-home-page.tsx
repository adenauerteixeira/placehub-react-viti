import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell, LogoBadge } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { announcementImageUrl, usePublicAnnouncementCovers, usePublicAnnouncements } from '@/features/announcements/api'
import { PROPERTY_TYPE_LABELS } from '@/features/announcements/labels'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { usePublicTenant } from '@/features/tenants/api'
import { PublicAnnouncementCard } from './public-announcement-card'

const PROPERTY_TYPE_ORDER = Object.keys(PROPERTY_TYPE_LABELS) as (keyof typeof PROPERTY_TYPE_LABELS)[]

export function PublicTenantHomePage({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)
  const { resolvedTheme } = useTheme()
  const { data: announcements } = usePublicAnnouncements(tenant?.id)
  const announcementIds = useMemo(() => announcements?.map((a) => a.id) ?? [], [announcements])
  const { data: covers } = usePublicAnnouncementCovers(announcementIds)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')

  const sections = useMemo(() => {
    if (!announcements) return []
    return PROPERTY_TYPE_ORDER.map((type) => ({
      type,
      label: PROPERTY_TYPE_LABELS[type],
      items: announcements.filter((a) => a.property_type === type),
    })).filter((section) => section.items.length > 0)
  }, [announcements])

  if (isLoading) return <FullscreenSpinner />
  if (isError || !tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Confira o endereço ou fale com quem te enviou o link."
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

  return (
    <AppShell
      style={tenantThemeVars(tenant, resolvedTheme)}
      centerMain={sections.length === 0}
      header={
        <>
          {logoUrl ? (
            <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />
          ) : (
            <span className="text-lg font-semibold">{tenant.name}</span>
          )}
          <div className="flex items-center gap-4">
            <Link to="/corretores" className="text-muted-foreground hover:text-foreground text-sm">
              Corretores
            </Link>
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </>
      }
      footer={<AppFooter>{tenant.name} · Plataforma PlaceHub</AppFooter>}
    >
      {sections.length === 0 ? (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Anúncios em breve</CardTitle>
            <CardDescription>
              O catálogo público de imóveis de {tenant.name} está em construção. Volte em breve.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {tenant.email && <p>{tenant.email}</p>}
            {tenant.phone && <p>{tenant.phone}</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.type} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{section.label}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((announcement) => {
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
            </section>
          ))}
        </div>
      )}
    </AppShell>
  )
}
