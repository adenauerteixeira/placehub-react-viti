import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Announcement } from '@/features/announcements/api'
import { PROPERTY_TYPE_LABELS } from '@/features/announcements/labels'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function PublicAnnouncementCard({
  announcement,
  coverUrl,
}: {
  announcement: Announcement
  coverUrl: string | null
}) {
  const hasPromo = announcement.promotion && announcement.promotional_price != null

  return (
    <Link to={`/anuncios/${announcement.slug}`}>
      <Card className="h-full overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="bg-muted relative aspect-video w-full overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt={announcement.title} className="size-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
              Sem foto
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            {announcement.featured && <Badge>Destaque</Badge>}
            {hasPromo && <Badge variant="secondary">Promoção</Badge>}
          </div>
        </div>
        <CardContent className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">
            {PROPERTY_TYPE_LABELS[announcement.property_type]}
            {announcement.is_assignment && ' · Cessão'}
          </p>
          <h3 className="line-clamp-2 leading-snug font-medium">{announcement.title}</h3>
          <p className="text-muted-foreground text-sm">
            {[announcement.neighborhood, announcement.city].filter(Boolean).join(' · ') || '—'}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            {hasPromo ? (
              <>
                <span className="text-muted-foreground text-sm line-through">
                  {formatPrice(announcement.price)}
                </span>
                <span className="text-primary font-semibold">
                  {formatPrice(announcement.promotional_price!)}
                </span>
              </>
            ) : (
              <span className="font-semibold">{formatPrice(announcement.price)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
