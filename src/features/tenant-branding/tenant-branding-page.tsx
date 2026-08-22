import { type ReactNode, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import type { Tenant } from '@/features/tenants/api'
import { brandingAssetUrl, useUpdateTenantColors, type TenantColorsInput } from './api'
import { BrandingPreviewCard } from './branding-preview-card'
import { BrandingUploadField } from './branding-upload-field'
import { ColorField } from './color-field'
import {
  DARK_COLOR_FIELDS,
  LIGHT_COLOR_FIELDS,
  type DarkColorKey,
  type LightColorKey,
} from './defaults'

function colorsFromTenant(tenant: Tenant): TenantColorsInput {
  return {
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
    accent_color: tenant.accent_color,
    light_background_color: tenant.light_background_color,
    light_surface_color: tenant.light_surface_color,
    light_text_color: tenant.light_text_color,
    light_muted_text_color: tenant.light_muted_text_color,
    light_border_color: tenant.light_border_color,
    dark_primary_color: tenant.dark_primary_color,
    dark_accent_color: tenant.dark_accent_color,
    dark_background_color: tenant.dark_background_color,
    dark_surface_color: tenant.dark_surface_color,
    dark_text_color: tenant.dark_text_color,
    dark_muted_text_color: tenant.dark_muted_text_color,
    dark_border_color: tenant.dark_border_color,
    logo_light_background_color: tenant.logo_light_background_color,
    logo_dark_background_color: tenant.logo_dark_background_color,
    logo_light_background_transparent: tenant.logo_light_background_transparent,
    logo_dark_background_transparent: tenant.logo_dark_background_transparent,
  }
}

export function TenantBrandingPage() {
  const { tenant } = useTenantOutletContext()
  const updateColors = useUpdateTenantColors(tenant.id)
  const [colors, setColors] = useState<TenantColorsInput>(() => colorsFromTenant(tenant))

  useEffect(() => {
    setColors(colorsFromTenant(tenant))
  }, [tenant])

  function set<K extends keyof TenantColorsInput>(key: K, value: TenantColorsInput[K]) {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  function restoreDefaults(fields: { key: keyof TenantColorsInput; default: string }[]) {
    setColors((prev) => {
      const next = { ...prev }
      for (const field of fields) next[field.key] = field.default as never
      return next
    })
  }

  const dirty = JSON.stringify(colors) !== JSON.stringify(colorsFromTenant(tenant))

  async function handleSave() {
    try {
      await updateColors.mutateAsync(colors)
      toast.success('Identidade visual atualizada.')
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Logos e imagens</CardTitle>
          <CardDescription>
            Envio já atualiza imediatamente. PNG, JPEG, WebP ou SVG, até 2 MB (favicon aceita
            .ico também). A cor de fundo escolhida abaixo é só pra pré-visualização e some ao
            salvar como transparente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-xl border p-4">
              <BrandingUploadField
                tenantId={tenant.id}
                asset="logo-light"
                label="Logo (tema claro)"
                currentPath={tenant.logo_light_path}
                previewUrl={brandingAssetUrl(tenant.logo_light_path, tenant.updated_at)}
                previewStyle={{
                  background: colors.logo_light_background_transparent
                    ? 'transparent'
                    : colors.logo_light_background_color,
                }}
              />
              <div className="flex flex-wrap items-center gap-4">
                <ColorField
                  label="Fundo do logo"
                  value={colors.logo_light_background_color}
                  onChange={(v) => set('logo_light_background_color', v)}
                  disabled={colors.logo_light_background_transparent}
                  compact
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={colors.logo_light_background_transparent}
                    onCheckedChange={(c) => set('logo_light_background_transparent', c === true)}
                  />
                  Transparente
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border p-4">
              <BrandingUploadField
                tenantId={tenant.id}
                asset="logo-dark"
                label="Logo (tema escuro)"
                currentPath={tenant.logo_dark_path}
                previewUrl={brandingAssetUrl(tenant.logo_dark_path, tenant.updated_at)}
                previewStyle={{
                  background: colors.logo_dark_background_transparent
                    ? 'transparent'
                    : colors.logo_dark_background_color,
                }}
              />
              <div className="flex flex-wrap items-center gap-4">
                <ColorField
                  label="Fundo do logo"
                  value={colors.logo_dark_background_color}
                  onChange={(v) => set('logo_dark_background_color', v)}
                  disabled={colors.logo_dark_background_transparent}
                  compact
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={colors.logo_dark_background_transparent}
                    onCheckedChange={(c) => set('logo_dark_background_transparent', c === true)}
                  />
                  Transparente
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <BrandingUploadField
              tenantId={tenant.id}
              asset="background-image"
              label="Plano de fundo"
              currentPath={tenant.background_image_path}
              previewUrl={brandingAssetUrl(tenant.background_image_path, tenant.updated_at)}
            />
            <BrandingUploadField
              tenantId={tenant.id}
              asset="favicon"
              label="Favicon"
              currentPath={tenant.favicon_path}
              previewUrl={brandingAssetUrl(tenant.favicon_path, tenant.updated_at)}
              accept="image/png,image/svg+xml,image/x-icon"
            />
            <BrandingUploadField
              tenantId={tenant.id}
              asset="placeholder-image"
              label="Imagem sem foto"
              currentPath={tenant.placeholder_image_path}
              previewUrl={brandingAssetUrl(tenant.placeholder_image_path, tenant.updated_at)}
            />
          </div>
        </CardContent>
      </Card>

      <BrandingThemeSection
        title="Tema claro"
        fields={LIGHT_COLOR_FIELDS}
        colors={colors}
        onChange={set}
        onRestoreDefaults={() => restoreDefaults(LIGHT_COLOR_FIELDS)}
        preview={
          <BrandingPreviewCard
            background={colors.light_background_color}
            surface={colors.light_surface_color}
            border={colors.light_border_color}
            text={colors.light_text_color}
            mutedText={colors.light_muted_text_color}
            accent={colors.accent_color}
          />
        }
      />

      <BrandingThemeSection
        title="Tema escuro"
        fields={DARK_COLOR_FIELDS}
        colors={colors}
        onChange={set}
        onRestoreDefaults={() => restoreDefaults(DARK_COLOR_FIELDS)}
        preview={
          <BrandingPreviewCard
            background={colors.dark_background_color}
            surface={colors.dark_surface_color}
            border={colors.dark_border_color}
            text={colors.dark_text_color}
            mutedText={colors.dark_muted_text_color}
            accent={colors.dark_accent_color}
          />
        }
      />

      <div>
        <Button onClick={handleSave} disabled={!dirty || updateColors.isPending}>
          {updateColors.isPending && <Loader2 className="animate-spin" />}
          Salvar identidade visual
        </Button>
      </div>
    </div>
  )
}

function BrandingThemeSection<K extends LightColorKey | DarkColorKey>({
  title,
  fields,
  colors,
  onChange,
  onRestoreDefaults,
  preview,
}: {
  title: string
  fields: { key: K; label: string; default: string }[]
  colors: TenantColorsInput
  onChange: (key: K, value: string) => void
  onRestoreDefaults: () => void
  preview: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={onRestoreDefaults}>
            Restaurar cores padrão
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          {fields.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              value={colors[field.key] as string}
              onChange={(v) => onChange(field.key, v)}
            />
          ))}
        </div>
        {preview}
      </CardContent>
    </Card>
  )
}

