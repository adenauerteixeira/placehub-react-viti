import { announcementImageUrl } from '@/features/announcements/api'
import { PROPERTY_TYPE_ICONS, type AnnouncementSection } from '@/features/announcements/labels'
import { ShowcaseAnnouncementCard } from './showcase-announcement-card'

export function ShowcaseCategorySection({
  section,
  covers,
}: {
  section: AnnouncementSection
  covers: Record<string, string> | undefined
}) {
  const Icon = PROPERTY_TYPE_ICONS[section.type]

  return (
    <section className="flex flex-col gap-4">
      <div className="from-primary/10 border-primary/30 flex items-center gap-3 rounded-xl border-l-4 bg-gradient-to-r to-transparent py-3 pr-4 pl-4">
        <span className="relative flex size-11 shrink-0">
          <span className="bg-primary text-primary-foreground flex size-full items-center justify-center rounded-full shadow-sm">
            <Icon className="size-5" />
          </span>
          <span className="bg-destructive ring-background absolute -top-1 -right-1 flex size-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ring-2">
            {section.items.length}
          </span>
        </span>
        <h2 className="text-xl font-semibold tracking-tight">{section.label}</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((announcement) => {
          const coverPath = covers?.[announcement.id]
          return (
            <ShowcaseAnnouncementCard
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
