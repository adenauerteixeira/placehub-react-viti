import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell } from '@/components/app-shell'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { brokerPhotoUrl, usePublicBrokers } from '@/features/brokers/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { usePublicTenant } from '@/features/tenants/api'

export function PublicBrokersListPage({ tenantSlug }: { tenantSlug: string }) {
  const { data: tenant, isLoading } = usePublicTenant(tenantSlug)
  const { resolvedTheme } = useTheme()
  const { data: brokers } = usePublicBrokers(tenant?.id)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')

  if (isLoading) return <FullscreenSpinner />
  if (!tenant) {
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
      centerMain={!brokers || brokers.length === 0}
      header={
        <>
          <TenantBrand tenant={tenant} dark={dark} />
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
              Anúncios
            </Link>
            <ThemeToggle />
          </div>
        </>
      }
      footer={<AppFooter>{tenant.name} · Plataforma PlaceHub</AppFooter>}
    >
      {!brokers || brokers.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum corretor cadastrado ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brokers.map((broker) => {
            const photoUrl = brokerPhotoUrl(broker.photo_path, broker.updated_at)
            return (
              <Link key={broker.id} to={`/corretores/${broker.slug}`}>
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center gap-2 pt-6 text-center">
                    <div className="bg-muted flex size-20 items-center justify-center overflow-hidden rounded-full">
                      {photoUrl ? (
                        <img src={photoUrl} alt={broker.name} className="size-full object-cover" />
                      ) : (
                        <User className="text-muted-foreground size-8" />
                      )}
                    </div>
                    <p className="font-medium">{broker.name}</p>
                    {broker.creci && (
                      <p className="text-muted-foreground text-xs">
                        CRECI {broker.creci}
                        {broker.creci_state ? `/${broker.creci_state}` : ''}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
