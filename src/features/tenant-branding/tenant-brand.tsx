import { LogoBadge } from '@/components/app-shell'
import { formatPhone } from '@/lib/phone'
import { cn } from '@/lib/utils'
import type { Tenant } from '@/features/tenants/api'
import { brandingAssetUrl } from './api'

/** Alfa (0-255) de um hex de 6 ou 8 dígitos — 6 dígitos é sempre opaco. Usa
 * pra saber se o tenant configurou uma cor de fundo de verdade (alfa > 0)
 * ou deixou no padrão totalmente transparente. */
function hexAlphaByte(hex: string): number {
  return hex.length === 9 ? parseInt(hex.slice(7, 9), 16) : 255
}

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
  dimBackdrop = false,
}: {
  tenant: Tenant
  dark: boolean
  showInstitutional?: boolean
  /** Escurece o fundo atrás de endereço/CRECI com um véu translúcido —
   * necessário quando esse texto flutua sobre uma foto de hero arbitrária
   * (Vitrine Premium com cabeçalho transparente), onde a cor de marca do
   * tenant sozinha pode não ter contraste nenhum contra a foto. */
  dimBackdrop?: boolean
}) {
  const { logoUrl, logoBackground } = useTenantLogo(tenant, dark)
  const showLogo = !showInstitutional || tenant.public_header_show_logo
  const showName = !showInstitutional || tenant.public_header_show_name
  const addressParts = [
    tenant.address,
    tenant.neighborhood,
    [tenant.city, tenant.state].filter(Boolean).join(' - '),
    tenant.zip_code && `CEP ${tenant.zip_code}`,
    tenant.phone && formatPhone(tenant.phone),
  ].filter(Boolean)
  const showAddress = showInstitutional && tenant.public_header_show_address && addressParts.length > 0
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

  const addressBackgroundColor = tenant.public_header_address_background_color
  const hasCustomAddressBackground = hexAlphaByte(addressBackgroundColor) > 0

  return (
    <div className="flex min-w-0 items-center gap-3">
      {showLogo && logoUrl && <LogoBadge src={logoUrl} alt={tenant.name} background={logoBackground} />}
      {showName && (
        <span className="text-lg font-semibold whitespace-nowrap" style={nameColor ? { color: nameColor } : undefined}>
          {displayName}
        </span>
      )}

      {(showAddress || showCreci) && (
        <>
          <span
            className={cn('hidden h-8 w-px shrink-0 sm:block', !hasCustomAddressBackground && 'bg-border')}
            style={hasCustomAddressBackground ? { backgroundColor: addressBackgroundColor } : undefined}
          />
          <span
            className={cn(
              'hidden max-w-80 rounded-lg px-2 py-1 sm:inline-block',
              dimBackdrop && (hasCustomAddressBackground ? 'backdrop-blur-sm' : 'bg-black/30 backdrop-blur-sm'),
            )}
            style={hasCustomAddressBackground ? { backgroundColor: addressBackgroundColor } : undefined}
          >
            {/* `backdrop-blur` no mesmo elemento do `line-clamp` vaza um
             * fiapo da 3ª linha em alguns navegadores — span aninhado
             * separa as duas responsabilidades. */}
            <span className="text-muted-foreground line-clamp-2 text-[10px] leading-tight">
              {showAddress && addressParts.join(', ')}
              {showAddress && showCreci && ' · '}
              {showCreci && (
                <>
                  CRECI-J <span className="font-bold">{tenant.creci_juridico}</span>
                </>
              )}
            </span>
          </span>
        </>
      )}
    </div>
  )
}
