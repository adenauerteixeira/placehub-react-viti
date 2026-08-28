import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { Announcement } from '@/features/announcements/api'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Cartão glassmórfico com os dados do imóvel — sobe por baixo, sobrepondo
 * parcialmente a galeria (posicionado absoluto no rodapé do wrapper de
 * PropertyStory). Começa com opacity 0 via CSS; a entrada (opacity +
 * translateY + blur + leve scale) é toda feita de fora, pelo GSAP timeline
 * de PropertyTypeSection, através do ref. */
export const PropertyGlassCard = forwardRef<HTMLDivElement, { announcement: Announcement }>(
  function PropertyGlassCard({ announcement }, ref) {
    const hasPromo = announcement.promotion && announcement.promotional_price != null
    const specs = [
      announcement.bedrooms ? `${announcement.bedrooms} quartos` : null,
      announcement.bathrooms ? `${announcement.bathrooms} banheiros` : null,
      announcement.parking_spaces ? `${announcement.parking_spaces} vagas` : null,
    ].filter(Boolean)

    return (
      <div
        ref={ref}
        className="absolute inset-x-4 bottom-6 z-10 mx-auto max-w-xl rounded-2xl border border-white/20 bg-white/10 p-5 opacity-0 shadow-2xl backdrop-blur-xl sm:bottom-8 sm:p-6 dark:border-white/10 dark:bg-black/20"
      >
        <h3 className="text-xl font-semibold text-white drop-shadow-sm sm:text-2xl">
          {announcement.title}
        </h3>
        <p className="mt-1 text-sm text-white/85">
          {[announcement.neighborhood, announcement.city].filter(Boolean).join(' · ') || '—'}
          {specs.length > 0 ? ` · ${specs.join(' · ')}` : ''}
        </p>
        {announcement.description && (
          <p className="mt-2 line-clamp-2 text-sm text-white/80">{announcement.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {hasPromo ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-white/60 line-through">
                {formatPrice(announcement.price)}
              </span>
              <span className="text-xl font-semibold text-white">
                {formatPrice(announcement.promotional_price!)}
              </span>
            </div>
          ) : (
            <span className="text-xl font-semibold text-white">{formatPrice(announcement.price)}</span>
          )}
          <Button asChild size="sm">
            <Link to={`/anuncios/${announcement.slug}`}>Ver imóvel</Link>
          </Button>
        </div>
      </div>
    )
  },
)
