import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell, LogoBadge } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { usePublicTenant } from '@/features/tenants/api'

export function PublicTenantHomePage({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)
  const { resolvedTheme } = useTheme()

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
      centerMain
      header={
        <>
          {logoUrl ? (
            <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />
          ) : (
            <span className="text-lg font-semibold">{tenant.name}</span>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </>
      }
      footer={
        <AppFooter>
          {tenant.name} · Plataforma PlaceHub
        </AppFooter>
      }
    >
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
    </AppShell>
  )
}
