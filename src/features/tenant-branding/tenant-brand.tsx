import { LogoBadge } from '@/components/app-shell'
import type { Tenant } from '@/features/tenants/api'
import { brandingAssetUrl } from './api'

/** Logo (se houver) + nome do tenant, lado a lado — usado em todo header
 * público/interno pra deixar claro qual imobiliária é essa (o logo
 * sozinho não é suficiente: nem todo tenant tem um, e o nome por escrito
 * ajuda reconhecimento mesmo quando tem). */
export function useTenantLogo(tenant: Tenant, dark: boolean) {
  const logoPath = dark ? tenant.logo_dark_path : tenant.logo_light_path
  const logoUrl = brandingAssetUrl(logoPath, tenant.updated_at)
  const logoBackground = dark
    ? tenant.logo_dark_background_transparent
      ? 'transparent'
      : tenant.logo_dark_background_color
    : tenant.logo_light_background_transparent
      ? 'transparent'
      : tenant.logo_light_background_color
  return { logoUrl, logoBackground }
}

/** `showInstitutional` liga endereço/CRECI Jurídico e os switches de
 * mostrar/esconder logo/nome (Identidade Visual > Página pública > Dados
 * institucionais) — só as 3 variantes de home pública passam isso; nas
 * demais telas (corretores, anúncio, login) o logo+nome continuam sempre
 * visíveis, como já era antes dessas configurações existirem. */
export function TenantBrand({
  tenant,
  dark,
  showInstitutional = false,
}: {
  tenant: Tenant
  dark: boolean
  showInstitutional?: boolean
}) {
  const { logoUrl, logoBackground } = useTenantLogo(tenant, dark)
  const showLogo = !showInstitutional || tenant.public_header_show_logo
  const showName = !showInstitutional || tenant.public_header_show_name
  const showAddress = showInstitutional && tenant.public_header_show_address && tenant.address
  const showCreci = showInstitutional && tenant.public_header_show_creci && tenant.creci_juridico
  const displayName =
    (showInstitutional && tenant.public_header_display_name) || tenant.name

  return (
    <div className="flex min-w-0 items-center gap-3">
      {showLogo && logoUrl && <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />}
      {showName && <span className="text-lg font-semibold whitespace-nowrap">{displayName}</span>}

      {(showAddress || showCreci) && (
        <>
          <span className="bg-border hidden h-8 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 flex-col gap-0.5 sm:flex">
            {showAddress && (
              <span className="text-muted-foreground line-clamp-2 max-w-52 text-[10px] leading-tight">
                {tenant.address}
              </span>
            )}
            {showCreci && (
              <span className="bg-primary/10 text-primary w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                CRECI-J {tenant.creci_juridico}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
