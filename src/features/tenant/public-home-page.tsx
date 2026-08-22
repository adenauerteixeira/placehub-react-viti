import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
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

  const logoPath = resolvedTheme === 'dark' ? tenant.logo_dark_path : tenant.logo_light_path
  const logoUrl = brandingAssetUrl(logoPath, tenant.updated_at)
  const brandStyle = {
    '--primary': tenant.primary_color,
    '--ring': tenant.primary_color,
    '--accent': tenant.accent_color,
  } as CSSProperties

  return (
    <div className="flex min-h-svh flex-col" style={brandStyle}>
      <header className="flex items-center justify-between border-b px-6 py-4">
        {logoUrl ? (
          <img src={logoUrl} alt={tenant.name} className="h-8 max-w-40 object-contain" />
        ) : (
          <span className="text-lg font-semibold">{tenant.name}</span>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
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
      </main>
    </div>
  )
}
