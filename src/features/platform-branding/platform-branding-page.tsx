import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'
import { platformBrandingAssetUrl, usePlatformSettings, useUpdatePlatformBackgroundBorder } from './api'
import { PlatformUploadField } from './platform-upload-field'

export function PlatformBrandingPage() {
  const { data: settings, isLoading, isError } = usePlatformSettings()
  const updateBorder = useUpdatePlatformBackgroundBorder()

  async function handleBorderChange(theme: 'light' | 'dark', show: boolean) {
    try {
      await updateBorder.mutateAsync({ theme, show })
    } catch (error) {
      toast.error('Não foi possível atualizar a borda', { description: errorMessage(error) })
    }
  }

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
                  Fundo da tela de login e banner da lista de imobiliárias, no tema claro.
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bg-light-border"
                    checked={settings.background_image_light_border}
                    onCheckedChange={(checked) => handleBorderChange('light', checked === true)}
                  />
                  <Label htmlFor="bg-light-border" className="text-sm font-normal">
                    Mostrar borda ao redor da imagem
                  </Label>
                </div>
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
                  Fundo da tela de login e banner da lista de imobiliárias, no tema escuro.
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bg-dark-border"
                    checked={settings.background_image_dark_border}
                    onCheckedChange={(checked) => handleBorderChange('dark', checked === true)}
                  />
                  <Label htmlFor="bg-dark-border" className="text-sm font-normal">
                    Mostrar borda ao redor da imagem
                  </Label>
                </div>
              </div>

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
