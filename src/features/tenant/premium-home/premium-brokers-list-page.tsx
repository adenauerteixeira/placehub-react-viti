import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { useTheme } from '@/lib/theme-provider'
import { ThemeScopeProvider } from '@/lib/theme-scope'
import { brokerPhotoUrl, usePublicBrokers } from '@/features/brokers/api'
import { tenantThemeVars } from '@/features/tenant-branding/apply-tenant-theme'
import { useTenantFavicon } from '@/features/tenant-branding/use-tenant-favicon'
import { useTenantTitle } from '@/features/tenant-branding/use-tenant-title'
import { usePublicTenant } from '@/features/tenants/api'
import { PremiumHeader } from './premium-header'
import { PremiumFooter } from './premium-footer'
import { PremiumWhatsappFab } from './premium-whatsapp-fab'

export function PremiumBrokersListPage({ tenantSlug }: { tenantSlug: string }) {
  const { data: tenant, isLoading } = usePublicTenant(tenantSlug)
  const { resolvedTheme } = useTheme()
  const { data: brokers } = usePublicBrokers(tenant?.id)
  const [scopeEl, setScopeEl] = useState<HTMLDivElement | null>(null)

  useTenantFavicon(tenant?.favicon_path ?? null, tenant?.updated_at ?? '')
  useTenantTitle(tenant?.name ?? null)

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
    <ThemeScopeProvider value={scopeEl}>
      <div
        ref={setScopeEl}
        className="bg-background text-foreground min-h-svh"
        style={tenantThemeVars(tenant, resolvedTheme)}
      >
        <PremiumHeader tenant={tenant} dark={dark} transparentOverHero={false} />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-24 pb-16">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">Nossos corretores</h1>
            <p className="text-muted-foreground text-sm">Quem cuida de cada etapa da sua negociação em {tenant.name}.</p>
          </div>

          {!brokers || brokers.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum corretor cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {brokers.map((broker) => {
                const photoUrl = brokerPhotoUrl(broker.photo_path, broker.updated_at)
                return (
                  <Link
                    key={broker.id}
                    to={`/corretores/${broker.slug}`}
                    className="ring-border flex flex-col items-center gap-2 rounded-2xl bg-card p-6 text-center shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="bg-muted ring-primary/15 flex size-20 items-center justify-center overflow-hidden rounded-full ring-4">
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
                  </Link>
                )
              })}
            </div>
          )}
        </main>

        <PremiumFooter tenant={tenant} />
        <PremiumWhatsappFab tenant={tenant} />
      </div>
    </ThemeScopeProvider>
  )
}
