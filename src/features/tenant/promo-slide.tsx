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
  badge,
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
  badge?: ReactNode
  extraButton?: ReactNode
}) {
  return (
    <section
      className={cn(
        'relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl p-6 text-white sm:min-h-64 sm:p-10',
        showBorder && 'border',
      )}
      style={
        !imageUrl
          ? { background: 'linear-gradient(135deg, var(--primary), var(--accent))' }
          : { background: backgroundColor }
      }
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
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}
      {badge && <div className="absolute top-4 right-4">{badge}</div>}
      <div className="relative flex flex-col gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="max-w-xl text-white/90">{subtitle}</p>}
        {subtitle2 && <p className="max-w-xl text-white/80">{subtitle2}</p>}
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
