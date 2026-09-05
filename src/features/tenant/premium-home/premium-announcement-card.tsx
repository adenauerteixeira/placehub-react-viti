import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Bath, BedDouble, Heart, Ruler, Sparkles, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/features/announcements/api'
import { PROPERTY_TYPE_LABELS } from '@/features/announcements/labels'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Card da Vitrine Premium — independente do ShowcaseAnnouncementCard (a
 * Vitrine "clássica" continua com o card de sempre). Preço fica sobre a
 * própria foto (overlay em gradiente), não empilhado abaixo dela, e mostra
 * quartos/banheiros/m² — dados que hoje não aparecem em nenhum card do
 * sistema. */
export function PremiumAnnouncementCard({
  announcement,
  coverUrl,
  placeholderUrl,
  isFavorite = false,
  onToggleFavorite,
  revealDelay = 0,
}: {
  announcement: Announcement
  coverUrl: string | null
  /** "Anúncio sem foto" (Identidade Visual) — mostrada no lugar da capa
   * quando o anúncio não tem nenhuma foto própria. */
  placeholderUrl?: string | null
  isFavorite?: boolean
  onToggleFavorite?: () => void
  /** Atraso (em segundos) antes da entrada — usado pra criar uma cascata
   * entre os primeiros cards da primeira categoria, não pra todas (as
   * demais já ficam fora da tela e entram sozinhas ao rolar). */
  revealDelay?: number
}) {
  const hasPromo = announcement.promotion && announcement.promotional_price != null
  const details = [
    announcement.bedrooms != null && { icon: BedDouble, label: `${announcement.bedrooms}` },
    announcement.bathrooms != null && { icon: Bath, label: `${announcement.bathrooms}` },
    announcement.private_area != null && { icon: Ruler, label: `${announcement.private_area}m²` },
  ].filter(Boolean) as { icon: typeof BedDouble; label: string }[]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.4, delay: revealDelay, ease: 'easeOut' }}
    >
      <Link to={`/anuncios/${announcement.slug}`} className="group block h-full">
        <div className="ring-border hover:ring-primary h-full overflow-hidden rounded-2xl bg-card shadow-sm ring-1 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_18px_var(--primary)]">
          <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={announcement.title}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : placeholderUrl ? (
              <img src={placeholderUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
                Sem foto
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />

            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleFavorite()
                }}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                aria-pressed={isFavorite}
                className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                <Heart className={cn('size-4', isFavorite && 'fill-current text-red-500')} />
              </button>
            )}

            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              {announcement.featured && (
                <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Sparkles className="size-3" />
                  Destaque
                </Badge>
              )}
              {hasPromo && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="size-3" />
                  Promoção
                </Badge>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 text-white">
              {hasPromo ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-white/70 line-through">{formatPrice(announcement.price)}</span>
                  <span className="text-lg font-semibold">{formatPrice(announcement.promotional_price!)}</span>
                </div>
              ) : (
                <span className="text-lg font-semibold">{formatPrice(announcement.price)}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 p-4">
            <p className="text-muted-foreground text-xs">
              {PROPERTY_TYPE_LABELS[announcement.property_type]}
              {announcement.is_assignment && ' · Cessão'}
            </p>
            <h3 className="line-clamp-2 leading-snug font-medium">{announcement.title}</h3>
            <p className="text-muted-foreground text-sm">
              {[announcement.neighborhood, announcement.city].filter(Boolean).join(' · ') || '—'}
            </p>

            {details.length > 0 && (
              <div className={cn('text-muted-foreground mt-1 flex items-center gap-3 border-t pt-2 text-xs')}>
                {details.map(({ icon: Icon, label }, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <Icon className="size-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
