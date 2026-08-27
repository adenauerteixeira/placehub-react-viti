import { motion } from 'motion/react'
import { announcementImageUrl, type Announcement, type PropertyType } from '@/features/announcements/api'
import { AnimatedAnnouncementCard } from './animated-announcement-card'

/** Uma categoria inteira: caixa fixa à esquerda (`position: sticky`, escopada
 * a esta própria `<section>`) + anúncios revelando à direita. A "passagem de
 * bastão" pra próxima categoria não precisa de JS nenhum: o sticky solta
 * sozinho quando esta `<section>` acaba, porque seu "containing block" (o
 * próprio elemento pai) termina ali — é geometria de layout, não um scroll
 * listener decidindo "categoria A acabou, mostra B". */
export function CategorySection({
  type,
  label,
  items,
  covers,
}: {
  type: PropertyType
  label: string
  items: Announcement[]
  covers: Record<string, string>
}) {
  return (
    <section
      id={`section-${type}`}
      className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-12"
    >
      <div className="top-28 h-fit lg:sticky">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ amount: 0.5, once: true }}
          transition={{ duration: 0.4 }}
          className="border-border bg-card rounded-2xl border p-6"
        >
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Categoria
          </p>
          <h2 className="text-3xl font-semibold">{label}</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {items.length} {items.length === 1 ? 'imóvel disponível' : 'imóveis disponíveis'}
          </p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-10">
        {items.map((announcement) => {
          const coverPath = covers[announcement.id]
          return (
            <AnimatedAnnouncementCard
              key={announcement.id}
              announcement={announcement}
              coverUrl={coverPath ? announcementImageUrl(coverPath) : null}
            />
          )
        })}
      </div>
    </section>
  )
}
