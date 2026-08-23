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

export function TenantBrand({ tenant, dark }: { tenant: Tenant; dark: boolean }) {
  const { logoUrl, logoBackground } = useTenantLogo(tenant, dark)
  return (
    <div className="flex items-center gap-2">
      {logoUrl && <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />}
      <span className="text-lg font-semibold whitespace-nowrap">{tenant.name}</span>
    </div>
  )
}
