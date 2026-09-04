import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { announcementImageUrl, usePublicAnnouncementCovers, usePublicAnnouncements } from '@/features/announcements/api'
import { groupAnnouncementsByType } from '@/features/announcements/labels'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import { usePublicTenant } from '@/features/tenants/api'
import { OwnPromoSlide } from './own-promo-slide'
import { PublicAnnouncementCard } from './public-announcement-card'

export function PublicTenantHomePage({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)
  const { resolvedTheme } = useTheme()
  const { data: announcements } = usePublicAnnouncements(tenant?.id)
  const announcementIds = useMemo(() => announcements?.map((a) => a.id) ?? [], [announcements])
  const { data: covers } = usePublicAnnouncementCovers(announcementIds)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')
  useTenantTitle(tenant?.name ?? null)

  const sections = useMemo(
    () => (announcements ? groupAnnouncementsByType(announcements) : []),
    [announcements],
  )

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

  return (
    <AppShell
      style={tenantThemeVars(tenant, resolvedTheme)}
      header={
        <>
          <TenantBrand tenant={tenant} dark={dark} showInstitutional />
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
      footer={
        <AppFooter>
          <span className="hidden sm:inline">
            © {new Date().getFullYear()} {tenant.name} — Conectando imóveis, corretores e
            oportunidades.
          </span>
          <span className="flex flex-col text-[11px] leading-tight sm:hidden">
            <span>
              © {new Date().getFullYear()} Place Hub — {tenant.name}
            </span>
            <span>Conectando imóveis, corretores e oportunidades.</span>
          </span>
        </AppFooter>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {tenant.public_hero_enabled && tenant.public_hero_own_active && <OwnPromoSlide tenant={tenant} />}

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
      </div>
    </AppShell>
  )
}
