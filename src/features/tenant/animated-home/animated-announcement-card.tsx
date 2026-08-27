import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import type { Announcement } from '@/features/announcements/api'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Revelação por anúncio: a foto entra primeiro, os dados assentam logo
 * depois (delay de 0.1s no mesmo trigger `whileInView`) — leva o efeito de
 * "foto → dados" pedido sem precisar de um segundo gatilho independente.
 * `whileInView` usa IntersectionObserver por baixo, então o custo por card
 * fica baixo mesmo com dezenas deles na página (ao contrário de um valor
 * ligado à posição de rolagem, que faria sentido pro hero/cabeçalho —
 * únicos na página — mas não pra uma lista longa de cards). */
export function AnimatedAnnouncementCard({
  announcement,
  coverUrl,
}: {
  announcement: Announcement
  coverUrl: string | null
}) {
  const hasPromo = announcement.promotion && announcement.promotional_price != null
  const specs = [
    announcement.bedrooms ? `${announcement.bedrooms} quartos` : null,
    announcement.bathrooms ? `${announcement.bathrooms} banheiros` : null,
    announcement.parking_spaces ? `${announcement.parking_spaces} vagas` : null,
  ].filter(Boolean)

  return (
    <Link to={`/anuncios/${announcement.slug}`} className="group block">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="border-border bg-card overflow-hidden rounded-2xl border"
      >
        <div className="bg-muted relative aspect-video w-full overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={announcement.title}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
              Sem foto
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-2 p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xl font-semibold">{announcement.title}</h3>
            {hasPromo ? (
              <div className="flex items-baseline gap-2">
                <span className="text-muted-foreground text-sm line-through">
                  {formatPrice(announcement.price)}
                </span>
                <span className="text-primary text-lg font-semibold">
                  {formatPrice(announcement.promotional_price!)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-semibold">{formatPrice(announcement.price)}</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            {[announcement.neighborhood, announcement.city].filter(Boolean).join(' · ') || '—'}
            {specs.length > 0 ? ` · ${specs.join(' · ')}` : ''}
          </p>
          {announcement.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{announcement.description}</p>
          )}
        </motion.div>
      </motion.div>
    </Link>
  )
}
