import { LogoBadge } from '@/components/app-shell'
import { AppVersionBadge } from '@/components/app-version-badge'
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

/** `showInstitutional` liga o CRECI Jurídico e os switches de
 * mostrar/esconder logo/nome (Identidade Visual > Página pública > Dados
 * institucionais) — só as variantes de home pública passam isso; nas
 * demais telas (corretores, anúncio, login) o logo+nome continuam sempre
 * visíveis, como já era antes dessas configurações existirem. Endereço não
 * aparece aqui — fica só no rodapé da página. */
export function TenantBrand({
  tenant,
  dark,
  showInstitutional = false,
  dimBackdrop = false,
}: {
  tenant: Tenant
  dark: boolean
  showInstitutional?: boolean
  dimBackdrop?: boolean
}) {
  const { logoUrl, logoBackground } = useTenantLogo(tenant, dark)
  const showLogo = !showInstitutional || tenant.public_header_show_logo
  const showName = !showInstitutional || tenant.public_header_show_name
  const showCreci = showInstitutional && tenant.public_header_show_creci && tenant.creci_juridico
  const displayName =
    (showInstitutional && tenant.public_header_display_name) || tenant.name

  // Sobre foto de hero (dimBackdrop), o cabeçalho já sobrescreve
  // --foreground pra branco automaticamente (ver premium-header.tsx) — uma
  // cor fixa escolhida pensando em fundo sólido poderia ficar ilegível
  // numa foto qualquer, então nesse caso o nome herda a cor automática em
  // vez de usar a configurada.
  const nameColor = dimBackdrop
    ? undefined
    : dark
      ? tenant.public_header_name_dark_color
      : tenant.public_header_name_light_color

  return (
    <div className="flex min-w-0 items-center gap-3">
      {showLogo && logoUrl && (
        <div className="relative shrink-0">
          <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />
          <AppVersionBadge className="absolute -top-1.5 -right-1.5" />
        </div>
      )}
      {showName && (
        <div className="flex min-w-0 flex-col justify-center">
          <span
            className="text-lg leading-tight font-semibold whitespace-nowrap"
            style={nameColor ? { color: nameColor } : undefined}
          >
            {displayName}
          </span>
          {showCreci && (
            <span className="text-muted-foreground text-[10px] leading-tight whitespace-nowrap">
              CRECI-J <span className="font-bold">{tenant.creci_juridico}</span>
            </span>
          )}
        </div>
      )}
      {(!showLogo || !logoUrl) && <AppVersionBadge />}
    </div>
  )
}
