import { useEffect, useMemo } from 'react'
import { MotionConfig } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePublicAnnouncementCovers, usePublicAnnouncements } from '@/features/announcements/api'
import { groupAnnouncementsByType } from '@/features/announcements/labels'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import type { Tenant } from '@/features/tenants/api'
import { useTheme } from '@/lib/theme-provider'
import { CategoryNav } from './category-nav'
import { CategorySection } from './category-section'
import { CollapsingHeader } from './collapsing-header'
import { HeroSection } from './hero-section'
import { useHeroCollapse } from './use-hero-collapse'

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
  const { data: covers } = usePublicAnnouncementCovers(announcementIds)
  const { heroRef, scrollYProgress } = useHeroCollapse()

  useTenantFavicon(tenant.favicon_path, tenant.updated_at)

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
  const coverMap = covers ?? {}

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={tenantThemeVars(tenant, resolvedTheme)}
        className="bg-background text-foreground min-h-dvh"
      >
        <HeroSection tenant={tenant} dark={dark} heroRef={heroRef} scrollYProgress={scrollYProgress} />
        <CollapsingHeader tenant={tenant} dark={dark} scrollYProgress={scrollYProgress} />

        <div className="pt-16">
          {sections.length > 0 ? (
            <>
              <CategoryNav sections={sections} />
              {sections.map((section) => (
                <CategorySection
                  key={section.type}
                  type={section.type}
                  label={section.label}
                  items={section.items}
                  covers={coverMap}
                />
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

        <footer className="text-muted-foreground border-border border-t px-6 py-8 text-center text-xs">
          © {new Date().getFullYear()} {tenant.name} · Plataforma PlaceHub
        </footer>
      </div>
    </MotionConfig>
  )
}
