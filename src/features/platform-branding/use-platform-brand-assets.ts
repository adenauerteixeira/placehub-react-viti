import { platformBrandingAssetUrl, usePlatformSettings } from './api'

/** Logo da plataforma (light/dark conforme o tema) — mesma ideia de
 * useTenantLogo, mas pra configuração global (sem tenant). */
export function usePlatformLogoUrl(dark: boolean): string | null {
  const { data: settings } = usePlatformSettings()
  if (!settings) return null
  const path = dark ? settings.logo_dark_path : settings.logo_light_path
  return platformBrandingAssetUrl(path, settings.updated_at)
}

/** Imagem de fundo da plataforma (light/dark conforme o tema). */
export function usePlatformBackgroundUrl(dark: boolean): string | null {
  const { data: settings } = usePlatformSettings()
  if (!settings) return null
  const path = dark ? settings.background_image_dark_path : settings.background_image_light_path
  return platformBrandingAssetUrl(path, settings.updated_at)
}
