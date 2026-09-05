import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { PROPERTY_TYPE_ICONS, type AnnouncementSection } from '@/features/announcements/labels'
import { categorySectionId } from './premium-category-section'

/** Pills fixadas logo abaixo do cabeçalho, uma por categoria com anúncio —
 * observa qual seção está mais visível pra marcar a pill ativa, e clicar
 * rola suavemente até ela. rootMargin desloca a "linha de detecção" pra perto
 * do topo (logo abaixo do header + da própria nav), não do centro da tela. */
export function PremiumCategoryNav({ sections }: { sections: AnnouncementSection[] }) {
  const [active, setActive] = useState<string | null>(sections[0]?.type ?? null)

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(categorySectionId(s.type)))
      .filter((el): el is HTMLElement => el != null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActive(visible[0].target.id.replace('premium-section-', ''))
        }
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  if (sections.length <= 1) return null

  return (
    <div className="bg-background/85 sticky top-16 z-20 w-full border-b backdrop-blur-xl">
      <nav className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-6 py-3">
        {sections.map((section) => {
          const Icon = PROPERTY_TYPE_ICONS[section.type]
          const isActive = active === section.type
          return (
            <button
              key={section.type}
              type="button"
              onClick={() =>
                document.getElementById(categorySectionId(section.type))?.scrollIntoView({ behavior: 'smooth' })
              }
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Icon className="size-3.5" />
              {section.label}
              <span className={cn('text-xs', isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                {section.items.length}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
