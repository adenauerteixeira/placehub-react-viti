import { Button } from '@/components/ui/button'
import { whatsappUrl } from '@/lib/whatsapp'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import type { Tenant } from '@/features/tenants/api'
import { PromoSlide } from './promo-slide'

/** Banner com dados da própria imobiliária — usado como hero da home
 * Clássica e como primeiro slide (sempre reservado, fixo) do carrossel da
 * Vitrine. Título/subtítulos/link são configuráveis em Identidade Visual >
 * Banner; sem nada configurado, cai nos valores padrão de sempre. */
export function OwnPromoSlide({ tenant, showBorder = true }: { tenant: Tenant; showBorder?: boolean }) {
  const heroImageUrl = brandingAssetUrl(tenant.background_image_path, tenant.updated_at)
  const title = tenant.public_hero_title || tenant.name
  const subtitle = tenant.public_hero_subtitle || 'Encontre seu próximo imóvel com quem entende do mercado!'

  return (
    <PromoSlide
      imageUrl={heroImageUrl}
      title={title}
      subtitle={subtitle}
      subtitle2={tenant.public_hero_subtitle_2}
      linkUrl={tenant.public_hero_link_url}
      linkLabel={tenant.public_hero_link_label}
      showBorder={showBorder}
      imageFit={tenant.public_hero_image_fit}
      imageAlign={tenant.public_hero_image_align}
      backgroundColor={tenant.public_hero_background_color}
      titleColor={tenant.public_hero_title_color}
      subtitleColor={tenant.public_hero_subtitle_color}
      subtitle2Color={tenant.public_hero_subtitle_2_color}
      overlayColor={tenant.public_hero_overlay_color}
      overlayOpacity={tenant.public_hero_overlay_opacity}
      borderColor={tenant.public_hero_border_color}
      borderWidth={tenant.public_hero_border_width}
      extraButton={
        tenant.phone ? (
          <Button asChild size="sm">
            <a href={whatsappUrl(tenant.phone, `Olá! Vim pelo site da ${tenant.name}.`)} target="_blank" rel="noreferrer">
              Fale conosco
            </a>
          </Button>
        ) : undefined
      }
    />
  )
}
