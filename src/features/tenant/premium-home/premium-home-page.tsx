import { useMemo, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme-provider'
import { ThemeScopeProvider } from '@/lib/theme-scope'
import { usePublicAnnouncementCovers, usePublicAnnouncements } from '@/features/announcements/api'
import { groupAnnouncementsByType } from '@/features/announcements/labels'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import { usePublicBannerAds } from '@/features/tenant-banner-ads/api'
import { usePublicTenant } from '@/features/tenants/api'
import { PremiumHeader } from './premium-header'
import { PremiumHero } from './premium-hero'
import { PremiumCategoryIntro } from './premium-category-intro'
import { PremiumCategoryNav } from './premium-category-nav'
import { PremiumCategorySection } from './premium-category-section'
import { PremiumFooter } from './premium-footer'
import { PremiumScrollCue } from './premium-scroll-cue'
import { PremiumWhatsappFab } from './premium-whatsapp-fab'
import { DEFAULT_PREMIUM_FILTERS, type PremiumFilters } from './premium-search-bar'
import { usePremiumFavorites } from './use-premium-favorites'

export function PremiumTenantHomePage({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)
  const { resolvedTheme } = useTheme()
  const { data: announcements } = usePublicAnnouncements(tenant?.id)
  const announcementIds = useMemo(() => announcements?.map((a) => a.id) ?? [], [announcements])
  const { data: covers } = usePublicAnnouncementCovers(announcementIds)
  const { data: ads } = usePublicBannerAds(tenant?.id)
  const { favorites, isFavorite, toggle: toggleFavorite } = usePremiumFavorites(tenant?.id)
  const [scopeEl, setScopeEl] = useState<HTMLDivElement | null>(null)
  const [filters, setFilters] = useState<PremiumFilters>(DEFAULT_PREMIUM_FILTERS)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')
  useTenantTitle(tenant?.name ?? null)

  const cities = useMemo(() => {
    if (!announcements) return []
    return Array.from(new Set(announcements.map((a) => a.city).filter((c): c is string => !!c))).sort()
  }, [announcements])

  const priceBounds = useMemo<[number, number]>(() => {
    if (!announcements || announcements.length === 0) return [0, 0]
    const prices = announcements.map((a) => a.promotional_price ?? a.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return min === max ? [min, min + 1] : [min, max]
  }, [announcements])

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return []
    const filtered = announcements.filter((a) => {
      if (filters.transactionType !== 'all' && a.transaction_type !== filters.transactionType) return false
      if (filters.propertyType !== 'all' && a.property_type !== filters.propertyType) return false
      if (filters.city !== 'all' && a.city !== filters.city) return false
      if (filters.onlyFavorites && !isFavorite(a.id)) return false
      if (filters.priceRange) {
        const price = a.promotional_price ?? a.price
        if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false
      }
      return true
    })

    if (filters.sortBy === 'price_asc' || filters.sortBy === 'price_desc') {
      const direction = filters.sortBy === 'price_asc' ? 1 : -1
      return [...filtered].sort(
        (a, b) => ((a.promotional_price ?? a.price) - (b.promotional_price ?? b.price)) * direction,
      )
    }
    return filtered
  }, [announcements, filters, isFavorite])

  const sections = useMemo(() => groupAnnouncementsByType(filteredAnnouncements), [filteredAnnouncements])

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
  const hasAnnouncements = (announcements?.length ?? 0) > 0
  const showCategoryIntro = hasAnnouncements && sections.length > 1
  const placeholderUrl = brandingAssetUrl(tenant.placeholder_image_path, tenant.updated_at)

  return (
    <MotionConfig reducedMotion="user">
      <ThemeScopeProvider value={scopeEl}>
        <div
          ref={setScopeEl}
          className="bg-background text-foreground min-h-svh"
          style={tenantThemeVars(tenant, resolvedTheme)}
        >
          <PremiumHeader tenant={tenant} dark={dark} transparentOverHero={tenant.public_hero_enabled} />

          <main className={cn('flex flex-col gap-12 pb-16', !tenant.public_hero_enabled && 'pt-16')}>
            {/* Hero + grade de categorias + selo de rolar, todos dentro do
                mesmo contêiner min-h-screen: a grade (PremiumCategoryIntro)
                usa flex-1 e absorve sozinha o espaço que sobra entre o hero
                e o selo, então o selo (último item) sempre gruda no fim
                dessa tela cheia — não importa quanto espaço o hero/busca
                ocupem ali em cima (varia por tenant e por largura), nem
                quantas categorias existam. */}
            <div className={cn('flex flex-col', showCategoryIntro && 'min-h-screen')}>
              <PremiumHero
                tenant={tenant}
                ads={ads ?? []}
                heroEnabled={tenant.public_hero_enabled}
                filters={filters}
                onFiltersChange={setFilters}
                cities={cities}
                priceBounds={priceBounds}
                resultCount={filteredAnnouncements.length}
                favoritesCount={favorites.length}
              />
              {showCategoryIntro && <PremiumCategoryIntro sections={sections} />}
              {showCategoryIntro && <PremiumScrollCue />}
            </div>

            {!hasAnnouncements ? (
              <div className="mx-auto w-full max-w-md px-6">
                <Card>
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
              </div>
            ) : (
              <>
                <PremiumCategoryNav sections={sections} />

                <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
                  {sections.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center">
                      Nenhum imóvel encontrado com esses filtros.
                    </p>
                  ) : (
                    sections.map((section, index) => (
                      <PremiumCategorySection
                        key={section.type}
                        section={section}
                        covers={covers}
                        placeholderUrl={placeholderUrl}
                        isFavorite={isFavorite}
                        onToggleFavorite={toggleFavorite}
                        isFirst={index === 0}
                        hasCategoryNav={sections.length > 1}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </main>

          <PremiumFooter tenant={tenant} />
          <PremiumWhatsappFab tenant={tenant} />
        </div>
      </ThemeScopeProvider>
    </MotionConfig>
  )
}
