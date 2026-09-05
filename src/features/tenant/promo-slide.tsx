import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Slide de banner com imagem de fundo (ou gradiente das cores do tenant, se
 * sem foto) e texto sobreposto opcional — layout compartilhado entre o slide
 * próprio da imobiliária (`OwnPromoSlide`) e os slides de patrocinador
 * (`AdSlide`, na Vitrine), pra manter os dois com a mesma cara. Título é a
 * única coisa sempre visível; subtítulos e botão só aparecem se preenchidos. */
export function PromoSlide({
  imageUrl,
  title,
  subtitle,
  subtitle2,
  linkUrl,
  linkLabel,
  showBorder = true,
  imageFit = 'cover',
  imageAlign = 'center',
  backgroundColor = '#000000',
  overlayColor = '#000000',
  overlayOpacity = 0.55,
  titleColor = '#ffffff',
  subtitleColor = '#ffffff',
  subtitle2Color = '#ffffff',
  borderColor = '#e5e7eb',
  borderWidth = 1,
  badge,
  badgePosition = 'top',
  extraButton,
}: {
  imageUrl: string | null
  title: string
  subtitle?: string | null
  subtitle2?: string | null
  linkUrl?: string | null
  linkLabel?: string | null
  showBorder?: boolean
  imageFit?: 'cover' | 'contain'
  imageAlign?: 'left' | 'center' | 'right'
  backgroundColor?: string
  /** Filtro sobre a foto, pra manter o texto legível em cima de qualquer
   * imagem — cor e intensidade configuráveis (Identidade Visual > Banner),
   * já que os anúncios de parceiros têm fotos de qualquer cor/luminosidade. */
  overlayColor?: string
  overlayOpacity?: number
  /** Cor de cada linha de texto — por anúncio (ou do slide Próprio), já que
   * a foto de fundo varia de brilho/cor de anúncio pra anúncio. */
  titleColor?: string
  subtitleColor?: string
  subtitle2Color?: string
  /** Cor/espessura da borda — por anúncio (ou do slide Próprio), já que cada
   * um pode combinar melhor com uma borda diferente. Só se aplica quando
   * showBorder (liga/desliga único por tenant). */
  borderColor?: string
  borderWidth?: number
  badge?: ReactNode
  /** 'bottom' evita brigar com um cabeçalho fixo que se sobrepõe ao próprio
   * banner (caso da Vitrine Premium) — a Vitrine e a home clássica, com
   * cabeçalho reservando espaço próprio acima do banner, continuam usando
   * o padrão 'top'. */
  badgePosition?: 'top' | 'bottom'
  extraButton?: ReactNode
}) {
  return (
    <section
      className="relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl p-6 text-white sm:min-h-64 sm:p-10"
      style={{
        ...(!imageUrl
          ? { background: 'linear-gradient(135deg, var(--primary), var(--accent))' }
          : { background: backgroundColor }),
        ...(showBorder ? { borderStyle: 'solid', borderWidth, borderColor } : {}),
      }}
    >
      {imageUrl && (
        <>
          <img
            src={imageUrl}
            alt=""
            className={cn(
              'absolute inset-0 size-full',
              imageFit === 'contain' ? 'object-contain' : 'object-cover',
              imageAlign === 'left' ? 'object-left' : imageAlign === 'right' ? 'object-right' : 'object-center',
            )}
          />
          <div className="absolute inset-0" style={{ backgroundColor: overlayColor, opacity: overlayOpacity }} />
        </>
      )}
      {badge && (
        <div
          className={cn(
            'absolute',
            // 'bottom': alinhado por especificação (5px do rodapé do anúncio,
            // 20px de margem direita) com o botão de pausa do carrossel — que
            // mora fora daqui (BannerCarousel) e recalcula sua própria
            // posição a partir do padding configurável do slide (Identidade
            // Visual > Banner). Aqui dentro é direto, sem esse ajuste, porque
            // esta <section> é o próprio anúncio. 68px = 20 (margem do botão)
            // + 28 (largura do botão, size-7) + 20 (gap entre os dois) —
            // âncora pela direita evita depender da largura variável do selo.
            badgePosition === 'bottom' ? 'right-[68px] bottom-[5px]' : 'top-4 right-4',
          )}
        >
          {badge}
        </div>
      )}
      <div className="relative flex flex-col gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl" style={{ color: titleColor }}>
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-xl" style={{ color: subtitleColor }}>
            {subtitle}
          </p>
        )}
        {subtitle2 && (
          <p className="max-w-xl" style={{ color: subtitle2Color }}>
            {subtitle2}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {extraButton}
          {linkUrl && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              <a href={linkUrl}>{linkLabel || 'Saiba mais'}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
