import { type ReactNode, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldLabel } from '@/components/field-label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { BannerAdsManager } from '@/features/tenant-banner-ads/banner-ads-manager'
import type { Tenant } from '@/features/tenants/api'
import {
  brandingAssetUrl,
  useSendTestEmail,
  useTogglePublicHeroEnabled,
  useUpdateTenantColors,
  type TenantColorsInput,
} from './api'
import { BrandingPreviewCard } from './branding-preview-card'
import { BrandingUploadField } from './branding-upload-field'
import { ColorField } from './color-field'
import { errorMessage } from '@/lib/errors'
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
    email_logo_background_color: tenant.email_logo_background_color,
    email_logo_background_transparent: tenant.email_logo_background_transparent,
    public_home_variant: tenant.public_home_variant,
    public_hero_full_width: tenant.public_hero_full_width,
    public_hero_autoplay_seconds: tenant.public_hero_autoplay_seconds,
    public_hero_autoplay_reverse: tenant.public_hero_autoplay_reverse,
    public_hero_show_arrows: tenant.public_hero_show_arrows,
    public_hero_show_border: tenant.public_hero_show_border,
    public_hero_sticky: tenant.public_hero_sticky,
    public_hero_badge_opacity: tenant.public_hero_badge_opacity,
    animated_hero_show_image: tenant.animated_hero_show_image,
    animated_hero_show_particles: tenant.animated_hero_show_particles,
    training_enabled: tenant.training_enabled,
    address: tenant.address ?? '',
    creci_juridico: tenant.creci_juridico ?? '',
    public_header_display_name: tenant.public_header_display_name ?? '',
    public_header_show_logo: tenant.public_header_show_logo,
    public_header_show_name: tenant.public_header_show_name,
    public_header_show_address: tenant.public_header_show_address,
    public_header_show_creci: tenant.public_header_show_creci,
  }
}

export function TenantBrandingPage() {
  const { tenant } = useTenantOutletContext()
  const updateColors = useUpdateTenantColors(tenant.id)
  const togglePublicHero = useTogglePublicHeroEnabled(tenant.id)
  const sendTestEmail = useSendTestEmail()
  const [colors, setColors] = useState<TenantColorsInput>(() => colorsFromTenant(tenant))
  const [testEmail, setTestEmail] = useState('')

  async function handleTogglePublicHero(checked: boolean) {
    try {
      await togglePublicHero.mutateAsync(checked)
      toast.success(checked ? 'Banner exibido na home pública.' : 'Banner ocultado da home pública.')
    } catch (error) {
      toast.error('Não foi possível atualizar', { description: errorMessage(error) })
    }
  }

  // Só reinicializa quando o tenant muda de verdade (id diferente) — não a
  // cada objeto novo que `useTenant` devolve (staleTime 0, refaz a busca
  // sozinho ao focar a janela de novo, por exemplo). Depender do objeto
  // `tenant` inteiro apagava edição não salva (ex: "segundos por slide")
  // toda vez que esse refetch em segundo plano acontecia no meio da edição.
  useEffect(() => {
    setColors(colorsFromTenant(tenant))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id])

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

  async function handleSendTestEmail() {
    try {
      await sendTestEmail.mutateAsync(testEmail)
      toast.success('E-mail de teste enviado.', { description: testEmail })
    } catch (error) {
      toast.error('Não foi possível enviar o e-mail de teste', {
        description: errorMessage(error),
      })
    }
  }

  async function handleSave() {
    try {
      await updateColors.mutateAsync(colors)
      toast.success('Identidade visual atualizada.')
    } catch (error) {
      toast.error('Não foi possível salvar', {
        description: errorMessage(error),
      })
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Tabs defaultValue="logos">
        <TabsList>
          <TabsTrigger value="logos">Logos e imagens</TabsTrigger>
          <TabsTrigger value="colors">Cores</TabsTrigger>
          <TabsTrigger value="public">Página pública</TabsTrigger>
          <TabsTrigger value="banner">Banner</TabsTrigger>
          <TabsTrigger value="emails">E-mails</TabsTrigger>
        </TabsList>

        <TabsContent value="logos" className="pt-4">
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
                        onCheckedChange={(c) =>
                          set('logo_light_background_transparent', c === true)
                        }
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

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="flex flex-col gap-3 rounded-xl border p-4">
                  <BrandingUploadField
                    tenantId={tenant.id}
                    asset="background-image"
                    label="Plano de fundo"
                    currentPath={tenant.background_image_path}
                    previewUrl={brandingAssetUrl(tenant.background_image_path, tenant.updated_at)}
                    stacked
                  />
                  <p className="text-muted-foreground text-xs">
                    Imagem de fundo usada no portal público da imobiliária (mesmo campo da aba
                    "Banner" &gt; Banner Próprio).
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border p-4">
                  <BrandingUploadField
                    tenantId={tenant.id}
                    asset="favicon"
                    label="Favicon"
                    currentPath={tenant.favicon_path}
                    previewUrl={brandingAssetUrl(tenant.favicon_path, tenant.updated_at)}
                    accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico,.png,.svg"
                    stacked
                  />
                  <p className="text-muted-foreground text-xs">
                    Ícone exibido na aba do navegador (aceita .ico).
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border p-4">
                  <BrandingUploadField
                    tenantId={tenant.id}
                    asset="placeholder-image"
                    label="Anúncio sem foto"
                    currentPath={tenant.placeholder_image_path}
                    previewUrl={brandingAssetUrl(tenant.placeholder_image_path, tenant.updated_at)}
                    stacked
                  />
                  <p className="text-muted-foreground text-xs">
                    Capa usada em anúncios cadastrados sem nenhuma foto própria.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="public" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Página pública</CardTitle>
              <CardDescription>
                Estilo e conteúdo da home pública (visitante), a que aparece em "/".
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <FieldLabel hint="Escolha qual versão da home pública roda em &quot;/&quot;. Dá pra alternar quantas vezes quiser — os anúncios e dados continuam os mesmos, só muda o estilo.">
                  Estilo da home pública
                </FieldLabel>
                <Select
                  value={colors.public_home_variant}
                  onValueChange={(v) => set('public_home_variant', v as 'classic' | 'animated' | 'showcase')}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Clássica</SelectItem>
                    <SelectItem value="animated">Animada (com rolagem cinematográfica)</SelectItem>
                    <SelectItem value="showcase">Vitrine (com carrossel de anúncios)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={tenant.public_hero_enabled}
                    onCheckedChange={handleTogglePublicHero}
                    disabled={togglePublicHero.isPending}
                  />
                  Mostrar banner na home pública
                </label>
                <p className="text-muted-foreground text-xs">
                  Liga ou desliga a seção de banner inteira — vale pra Clássica e pra Vitrine (aba
                  Banner, ao lado, tem o conteúdo e os anúncios).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Dados institucionais</CardTitle>
              <CardDescription>
                Nome, endereço e CRECI Jurídico exibidos no cabeçalho da home pública (Clássica,
                Animada e Vitrine). Cada informação só aparece se o campo estiver preenchido e o
                switch correspondente estiver ligado.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <FieldLabel
                  htmlFor="tenant-header-display-name"
                  hint={`Nome de fantasia mostrado no cabeçalho da home pública, no lugar de "${tenant.name}". Deixe em branco pra usar o nome do tenant normalmente — só muda a exibição ali, o resto do sistema continua usando o nome oficial.`}
                >
                  Nome exibido no cabeçalho (opcional)
                </FieldLabel>
                <Input
                  id="tenant-header-display-name"
                  placeholder={tenant.name}
                  value={colors.public_header_display_name}
                  onChange={(e) => set('public_header_display_name', e.target.value)}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel
                    htmlFor="tenant-address"
                    hint="Exibido em destaque reduzido no cabeçalho, ao lado do nome."
                  >
                    Endereço completo
                  </FieldLabel>
                  <Input
                    id="tenant-address"
                    placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF"
                    value={colors.address}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel
                    htmlFor="tenant-creci-juridico"
                    hint="CRECI da pessoa jurídica (imobiliária) — aparece com destaque visual no cabeçalho."
                  >
                    CRECI Jurídico
                  </FieldLabel>
                  <Input
                    id="tenant-creci-juridico"
                    placeholder="CRECI-J 12345-J"
                    value={colors.creci_juridico}
                    onChange={(e) => set('creci_juridico', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t pt-4">
                <FieldLabel hint="Decide o que aparece no cabeçalho da home pública — independente dessas informações estarem preenchidas em outras telas do sistema.">
                  Exibir no cabeçalho da home pública
                </FieldLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_header_show_logo}
                      onCheckedChange={(c) => set('public_header_show_logo', c)}
                    />
                    Logo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_header_show_name}
                      onCheckedChange={(c) => set('public_header_show_name', c)}
                    />
                    Nome
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_header_show_address}
                      onCheckedChange={(c) => set('public_header_show_address', c)}
                    />
                    Endereço
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_header_show_creci}
                      onCheckedChange={(c) => set('public_header_show_creci', c)}
                    />
                    CRECI Jurídico
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {colors.public_home_variant === 'animated' && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Hero da home animada</CardTitle>
                <CardDescription>
                  Fundo da tela cheia mostrada antes do visitante começar a rolar.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={colors.animated_hero_show_image}
                      onCheckedChange={(c) => set('animated_hero_show_image', c === true)}
                    />
                    Mostrar uma imagem de fundo
                  </label>
                  <p className="text-muted-foreground text-xs">
                    Desmarcado, o fundo vira o gradiente das cores do tenant (ou, se habilitado
                    abaixo, o efeito de partículas aparece por trás) — nunca fica em branco.
                  </p>
                </div>

                {colors.animated_hero_show_image && (
                  <div className="flex flex-col gap-3 rounded-xl border p-4">
                    <BrandingUploadField
                      tenantId={tenant.id}
                      asset="animated-hero-image"
                      label="Imagem do hero"
                      currentPath={tenant.animated_hero_image_path}
                      previewUrl={brandingAssetUrl(tenant.animated_hero_image_path, tenant.updated_at)}
                      stacked
                    />
                    <p className="text-muted-foreground text-xs">
                      Independente do "Plano de fundo" usado na home Clássica — pode ser a mesma
                      imagem ou uma diferente. Sem nada aqui, o hero cai no gradiente.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={colors.animated_hero_show_particles}
                      onCheckedChange={(c) => set('animated_hero_show_particles', c === true)}
                    />
                    Mostrar efeito de partículas conectadas
                  </label>
                  <p className="text-muted-foreground text-xs">
                    Pontos animados se conectando com linhas, num fundo escuro, reagindo ao mouse.
                    Funciona junto com a imagem de fundo (se houver) e continua visível por trás
                    de toda a rolagem dos anúncios, não só na tela inicial.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Treinamento da equipe</CardTitle>
              <CardDescription>
                Manual do corretor em formato web, direto no app — o mesmo conteúdo do PDF de
                treinamento, navegável por capítulo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={colors.training_enabled}
                    onCheckedChange={(c) => set('training_enabled', c === true)}
                  />
                  Habilitar página de treinamento pra equipe
                </label>
                <p className="text-muted-foreground text-xs">
                  Com isso marcado, um item "Treinamento" aparece no menu pra todos os usuários da
                  imobiliária, com o passo a passo completo do sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banner" className="flex flex-col gap-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Banner próprio e anúncios do banner (Vitrine)</CardTitle>
              <CardDescription>
                O Banner Próprio é sempre o primeiro slide (na Clássica é o único). Com o Estilo
                da home pública em "Vitrine" (aba Página pública), anúncios de empresas parceiras
                também aparecem aqui, sempre depois dele.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BannerAdsManager
                tenant={tenant}
                showSponsors={colors.public_home_variant === 'showcase'}
              />
            </CardContent>
          </Card>

          {colors.public_home_variant === 'showcase' && (
            <Card>
              <CardHeader>
                <CardTitle>Exibição do carrossel</CardTitle>
                <CardDescription>
                  Como o carrossel de banner se comporta na home Vitrine.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={colors.public_hero_full_width}
                      onCheckedChange={(c) => set('public_hero_full_width', c === true)}
                    />
                    Banner ocupa a largura total da página
                  </label>
                  <p className="text-muted-foreground text-xs">
                    Desmarcado, o carrossel fica contido na mesma largura dos anúncios (como é
                    hoje). Marcado, ele se estende de ponta a ponta da tela.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_hero_autoplay_reverse}
                      onCheckedChange={(c) => set('public_hero_autoplay_reverse', c)}
                    />
                    Inverter sentido da rolagem automática
                  </label>
                  <p className="text-muted-foreground text-xs">
                    Desligado, os slides avançam da direita pra esquerda (padrão). Ligado, o
                    sentido vira o contrário.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_hero_show_arrows}
                      onCheckedChange={(c) => set('public_hero_show_arrows', c)}
                    />
                    Mostrar setas de navegação
                  </label>
                  <p className="text-muted-foreground text-xs">
                    Desligado, o visitante só troca de slide arrastando (ou esperando a rolagem
                    automática).
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_hero_show_border}
                      onCheckedChange={(c) => set('public_hero_show_border', c)}
                    />
                    Mostrar borda ao redor do slide
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={colors.public_hero_sticky}
                      onCheckedChange={(c) => set('public_hero_sticky', c)}
                    />
                    Manter o banner fixo no topo ao rolar a página
                  </label>
                  <p className="text-muted-foreground text-xs">
                    Desligado, o banner rola junto com os anúncios (como é hoje). Ligado, ele
                    fica parado logo abaixo do cabeçalho enquanto o visitante rola a página.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel
                    htmlFor="hero-badge-opacity"
                    hint="Vale pra todos os anúncios de uma vez — não dá pra configurar um selo diferente por patrocinador."
                  >
                    Opacidade do selo "Publicidade"
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      id="hero-badge-opacity"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      className="accent-primary w-full max-w-xs"
                      value={colors.public_hero_badge_opacity}
                      onChange={(e) => set('public_hero_badge_opacity', Number(e.target.value))}
                    />
                    <span className="text-muted-foreground w-10 shrink-0 text-right text-sm">
                      {Math.round(colors.public_hero_badge_opacity * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="emails" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>E-mails</CardTitle>
              <CardDescription>
                Logo e fundo do cabeçalho usados nos e-mails transacionais (boas-vindas, reserva,
                comissão, recibo) — separado do que é usado no app, porque o e-mail precisa ser
                mais conservador pra funcionar em qualquer cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-xl border p-4">
                <BrandingUploadField
                  tenantId={tenant.id}
                  asset="email-logo"
                  label="Logo do e-mail (opcional, com fundo já embutido na imagem)"
                  currentPath={tenant.email_logo_path}
                  previewUrl={brandingAssetUrl(tenant.email_logo_path, tenant.updated_at)}
                  stacked
                />
                <p className="text-muted-foreground text-xs">
                  Alguns apps de e-mail (Gmail no Android, principalmente) reescrevem o e-mail no
                  modo escuro do celular e substituem cor de fundo definida em CSS — mas nunca
                  alteram os pixels de uma imagem. Enviando aqui uma versão do logo com o fundo já
                  "assado" na própria imagem (exportada assim de fora do sistema), a logo em si
                  fica imune a isso — mas o fundo do cabeçalho ao redor dela (configurável abaixo)
                  ainda pode ser substituído: uma cor bem próxima do branco tende a ser trocada por
                  esses apps; um tom mais saturado tende a escapar. Sem nada aqui, o e-mail usa o
                  Logo (tema claro) de "Logos e imagens".
                </p>
              </div>

              <div
                className="flex items-center justify-center rounded-xl p-6"
                style={{ background: '#eef0f3' }}
              >
                <div
                  className="flex items-center gap-3 rounded-2xl p-4 shadow-sm"
                  style={{
                    background: colors.email_logo_background_transparent
                      ? '#ffffff'
                      : colors.email_logo_background_color,
                  }}
                >
                  {tenant.email_logo_path || tenant.logo_light_path ? (
                    <img
                      src={
                        brandingAssetUrl(
                          tenant.email_logo_path ?? tenant.logo_light_path,
                          tenant.updated_at,
                        ) ?? undefined
                      }
                      alt={tenant.name}
                      className="h-9 w-auto"
                    />
                  ) : (
                    <div className="bg-muted h-9 w-12 rounded" />
                  )}
                  <span className="text-2xl font-bold" style={{ color: colors.primary_color }}>
                    {tenant.name}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <ColorField
                  label="Fundo do cabeçalho do e-mail"
                  value={colors.email_logo_background_color}
                  onChange={(v) => set('email_logo_background_color', v)}
                  disabled={colors.email_logo_background_transparent}
                  compact
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={colors.email_logo_background_transparent}
                    onCheckedChange={(c) => set('email_logo_background_transparent', c === true)}
                  />
                  Transparente
                </label>
              </div>

              <div className="flex flex-col gap-1.5 border-t pt-4">
                <FieldLabel
                  htmlFor="test-email"
                  hint="Envia um e-mail de exemplo usando a identidade visual JÁ SALVA (salve antes de testar um ajuste novo)."
                >
                  Enviar e-mail de teste
                </FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!testEmail || sendTestEmail.isPending}
                    onClick={handleSendTestEmail}
                  >
                    {sendTestEmail.isPending && <Loader2 className="animate-spin" />}
                    Enviar teste
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="flex flex-col gap-6 pt-4">
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
        </TabsContent>
      </Tabs>

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

