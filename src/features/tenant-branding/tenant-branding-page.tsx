import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { brandingAssetUrl, useUpdateTenantColors } from './api'
import { BrandingUploadField } from './branding-upload-field'
import { ColorField } from './color-field'

export function TenantBrandingPage() {
  const { tenant } = useTenantOutletContext()
  const updateColors = useUpdateTenantColors(tenant.id)

  const [primaryColor, setPrimaryColor] = useState(tenant.primary_color)
  const [accentColor, setAccentColor] = useState(tenant.accent_color)

  useEffect(() => {
    setPrimaryColor(tenant.primary_color)
    setAccentColor(tenant.accent_color)
  }, [tenant.primary_color, tenant.accent_color])

  const dirty = primaryColor !== tenant.primary_color || accentColor !== tenant.accent_color

  async function handleSaveColors() {
    try {
      await updateColors.mutateAsync({ primary_color: primaryColor, accent_color: accentColor })
      toast.success('Cores atualizadas.')
    } catch (error) {
      toast.error('Não foi possível salvar as cores', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cores da marca</CardTitle>
          <CardDescription>
            Usadas nos botões e destaques desta imobiliária, no painel e na home pública.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <ColorField label="Cor primária" value={primaryColor} onChange={setPrimaryColor} />
            <ColorField label="Cor de destaque" value={accentColor} onChange={setAccentColor} />
          </div>
          <div>
            <Button onClick={handleSaveColors} disabled={!dirty || updateColors.isPending}>
              {updateColors.isPending && <Loader2 className="animate-spin" />}
              Salvar cores
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo e favicon</CardTitle>
          <CardDescription>
            PNG, JPEG, WebP ou SVG, até 2 MB. Envio já atualiza imediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <BrandingUploadField
            tenantId={tenant.id}
            asset="logo-light"
            label="Logo (fundo claro)"
            previewUrl={brandingAssetUrl(tenant.logo_light_path, tenant.updated_at)}
            previewBg="bg-white"
          />
          <BrandingUploadField
            tenantId={tenant.id}
            asset="logo-dark"
            label="Logo (fundo escuro)"
            previewUrl={brandingAssetUrl(tenant.logo_dark_path, tenant.updated_at)}
            previewBg="bg-neutral-900"
          />
          <BrandingUploadField
            tenantId={tenant.id}
            asset="favicon"
            label="Favicon"
            previewUrl={brandingAssetUrl(tenant.favicon_path, tenant.updated_at)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
