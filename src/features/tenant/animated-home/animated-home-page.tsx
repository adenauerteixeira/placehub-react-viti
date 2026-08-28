import { lazy, Suspense, useEffect, useMemo } from 'react'
import { MotionConfig } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  usePublicAnnouncementGalleries,
  usePublicAnnouncements,
} from '@/features/announcements/api'
import { groupAnnouncementsByType } from '@/features/announcements/labels'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import type { Tenant } from '@/features/tenants/api'
import { useTheme } from '@/lib/theme-provider'
import { CategoryNav } from './category-nav'
import { CollapsingHeader } from './collapsing-header'
import { HeroSection } from './hero-section'
import { ParticlesBackground } from './particles-background'
import { useHeroCollapse } from './use-hero-collapse'

// Altura do cabeçalho compacto (h-16) mais, quando há mais de uma categoria,
// a barra de pills do CategoryNav (h-12, sticky logo abaixo dele) — usado
// tanto pra dimensionar cada seção pinada quanto pro ponto de início do
// pin, senão o topo de cada categoria nasce coberto pela barra de pills.
const HEADER_HEIGHT = 64
const CATEGORY_NAV_HEIGHT = 48

// GSAP (usado só a partir daqui pra baixo) fica no chunk separado desse
// import dinâmico — o hero, que precisa pintar rápido (LCP), não carrega
// essa dependência à toa.
const PropertyTypeSection = lazy(() =>
  import('./property-story/property-type-section').then((m) => ({
    default: m.PropertyTypeSection,
  })),
)

/** Variante animada da home pública (opt-in, Identidade Visual > Página
 * pública). Não usa <AppShell> de propósito: o AppShell é h-dvh
 * overflow-hidden com cabeçalho/rodapé fixos e um <main> que rola sozinho —
 * essa página precisa da rolagem real da janela pra `position: sticky` e
 * `useScroll` funcionarem sem container customizado (ver plano em
 * .claude/plans, "Decisão arquitetural que guia tudo"). */
export function AnimatedTenantHomePage({ tenant }: { tenant: Tenant }) {
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const { data: announcements } = usePublicAnnouncements(tenant.id)
  const announcementIds = useMemo(() => announcements?.map((a) => a.id) ?? [], [announcements])
  const { data: galleries } = usePublicAnnouncementGalleries(announcementIds)
  const { heroRef, scrollYProgress } = useHeroCollapse()

  useTenantFavicon(tenant.favicon_path, tenant.updated_at)
  useTenantTitle(tenant.name)

  // scroll-behavior:smooth precisa estar no elemento que a janela realmente
  // rola (<html>), não num container React — essa página não tem um.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.scrollBehavior
    root.style.scrollBehavior = 'smooth'
    return () => {
      root.style.scrollBehavior = previous
    }
  }, [])

  const sections = useMemo(
    () => (announcements ? groupAnnouncementsByType(announcements) : []),
    [announcements],
  )
  const galleryMap = galleries ?? {}
  const hasNav = sections.length > 1
  const topOffset = HEADER_HEIGHT + (hasNav ? CATEGORY_NAV_HEIGHT : 0)
  const showParticles = tenant.animated_hero_show_particles

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={tenantThemeVars(tenant, resolvedTheme)}
        className={showParticles ? 'text-foreground min-h-dvh' : 'bg-background text-foreground min-h-dvh'}
      >
        {showParticles && (
          <div className="fixed inset-0 -z-10">
            <ParticlesBackground />
          </div>
        )}

        <HeroSection tenant={tenant} dark={dark} heroRef={heroRef} scrollYProgress={scrollYProgress} />
        <CollapsingHeader tenant={tenant} dark={dark} scrollYProgress={scrollYProgress} />

        <div className="pt-16">
          {sections.length > 0 ? (
            <>
              <CategoryNav sections={sections} />
              {sections.map((section) => (
                <Suspense
                  key={section.type}
                  fallback={<div className="h-dvh w-full animate-pulse bg-muted/30" />}
                >
                  <PropertyTypeSection
                    type={section.type}
                    label={section.label}
                    items={section.items}
                    galleries={galleryMap}
                    topOffset={topOffset}
                    showParticles={showParticles}
                  />
                </Suspense>
              ))}
            </>
          ) : (
            <div className="flex justify-center px-6 py-24">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Anúncios em breve</CardTitle>
                  <CardDescription>
                    O catálogo público de imóveis de {tenant.name} está em construção. Volte em
                    breve.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {tenant.email && <p>{tenant.email}</p>}
                  {tenant.phone && <p>{tenant.phone}</p>}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <footer className="text-muted-foreground border-border bg-background/70 border-t px-6 py-8 text-center text-xs backdrop-blur-xl">
          © {new Date().getFullYear()} {tenant.name} · Plataforma PlaceHub
        </footer>
      </div>
    </MotionConfig>
  )
}
