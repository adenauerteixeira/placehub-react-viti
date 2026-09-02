import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { whatsappUrl } from '@/lib/whatsapp'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import type { Tenant } from '@/features/tenants/api'

/** Banner com dados da própria imobiliária — usado como hero da home
 * Clássica e como primeiro slide (sempre reservado) do carrossel da
 * Vitrine. Título/subtítulos/link são configuráveis em Identidade Visual
 * (Página pública > Conteúdo do banner próprio); sem nada configurado, cai
 * nos valores padrão de sempre. */
export function OwnPromoSlide({ tenant, showBorder = true }: { tenant: Tenant; showBorder?: boolean }) {
  const heroImageUrl = brandingAssetUrl(tenant.background_image_path, tenant.updated_at)
  const title = tenant.public_hero_title || tenant.name
  const subtitle = tenant.public_hero_subtitle || 'Encontre seu próximo imóvel com quem entende do mercado!'
  const linkLabel = tenant.public_hero_link_label || 'Saiba mais'

  return (
    <section
      className={cn(
        'relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl p-6 text-white sm:min-h-64 sm:p-10',
        showBorder && 'border',
      )}
      style={!heroImageUrl ? { background: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
    >
      {heroImageUrl && (
        <>
          <img src={heroImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}
      <div className="relative flex flex-col gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="max-w-xl text-white/90">{subtitle}</p>
        {tenant.public_hero_subtitle_2 && <p className="max-w-xl text-white/80">{tenant.public_hero_subtitle_2}</p>}
        <div className="flex flex-wrap gap-2">
          {tenant.phone && (
            <Button asChild size="sm">
              <a href={whatsappUrl(tenant.phone, `Olá! Vim pelo site da ${tenant.name}.`)} target="_blank" rel="noreferrer">
                Fale conosco
              </a>
            </Button>
          )}
          {tenant.public_hero_link_url && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              <a href={tenant.public_hero_link_url}>{linkLabel}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
