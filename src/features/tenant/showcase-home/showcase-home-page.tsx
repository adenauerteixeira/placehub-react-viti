import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { usePublicAnnouncementCovers, usePublicAnnouncements } from '@/features/announcements/api'
import { groupAnnouncementsByType } from '@/features/announcements/labels'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import { usePublicBannerAds } from '@/features/tenant-banner-ads/api'
import { usePublicTenant } from '@/features/tenants/api'
import { BannerCarousel } from './banner-carousel'
import { ShowcaseCategorySection } from './showcase-category-section'

export function ShowcaseTenantHomePage({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)
  const { resolvedTheme } = useTheme()
  const { data: announcements } = usePublicAnnouncements(tenant?.id)
  const announcementIds = useMemo(() => announcements?.map((a) => a.id) ?? [], [announcements])
  const { data: covers } = usePublicAnnouncementCovers(announcementIds)
  const { data: ads } = usePublicBannerAds(tenant?.id)

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
    <MotionConfig reducedMotion="user">
      <AppShell
        style={tenantThemeVars(tenant, resolvedTheme)}
        header={
          <>
            <TenantBrand tenant={tenant} dark={dark} />
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
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          {tenant.public_hero_enabled && <BannerCarousel tenant={tenant} ads={ads ?? []} />}

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
                <ShowcaseCategorySection key={section.type} section={section} covers={covers} />
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </MotionConfig>
  )
}
