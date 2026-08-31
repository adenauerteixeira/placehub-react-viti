import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { platformBrandingAssetUrl, usePlatformSettings } from './api'
import { PlatformUploadField } from './platform-upload-field'

export function PlatformBrandingPage() {
  const { data: settings, isLoading, isError } = usePlatformSettings()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade Visual da Plataforma</CardTitle>
          <CardDescription>
            Envio já atualiza imediatamente. PNG, JPEG, WebP ou SVG, até 2 MB (favicon aceita .ico
            também).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-40 w-full" />}

          {isError && (
            <p className="text-destructive text-sm">Não foi possível carregar as configurações.</p>
          )}

          {settings && (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <PlatformUploadField
                  asset="favicon"
                  label="Favicon"
                  currentPath={settings.favicon_path}
                  previewUrl={platformBrandingAssetUrl(settings.favicon_path, settings.updated_at)}
                />
                <p className="text-muted-foreground text-xs">
                  Aplicado no ícone da aba do navegador em toda a plataforma.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <PlatformUploadField
                  asset="logo-light"
                  label="Logo (tema claro)"
                  currentPath={settings.logo_light_path}
                  previewUrl={platformBrandingAssetUrl(settings.logo_light_path, settings.updated_at)}
                />
                <p className="text-muted-foreground text-xs">Exibido na tela de login da plataforma.</p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <PlatformUploadField
                  asset="logo-dark"
                  label="Logo (tema escuro)"
                  currentPath={settings.logo_dark_path}
                  previewUrl={platformBrandingAssetUrl(settings.logo_dark_path, settings.updated_at)}
                />
                <p className="text-muted-foreground text-xs">Exibido na tela de login da plataforma.</p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <PlatformUploadField
                  asset="background-image-light"
                  label="Imagem de fundo (tema claro)"
                  currentPath={settings.background_image_light_path}
                  previewUrl={platformBrandingAssetUrl(
                    settings.background_image_light_path,
                    settings.updated_at,
                  )}
                />
                <p className="text-muted-foreground text-xs">
                  Fundo da tela de login da plataforma, no tema claro.
                </p>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <PlatformUploadField
                  asset="background-image-dark"
                  label="Imagem de fundo (tema escuro)"
                  currentPath={settings.background_image_dark_path}
                  previewUrl={platformBrandingAssetUrl(
                    settings.background_image_dark_path,
                    settings.updated_at,
                  )}
                />
                <p className="text-muted-foreground text-xs">
                  Fundo da tela de login da plataforma, no tema escuro.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
