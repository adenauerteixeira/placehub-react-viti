import type { AnnouncementSection } from '@/features/announcements/labels'

/** Pills de navegação por categoria, logo abaixo do cabeçalho compacto —
 * `position: sticky` empilhado com o `top-16` (altura do cabeçalho) do
 * CollapsingHeader, sem nenhuma coordenação em JS entre os dois. Só um link
 * âncora nativo (`scroll-behavior: smooth` aplicado no root da página). */
export function CategoryNav({ sections }: { sections: AnnouncementSection[] }) {
  if (sections.length <= 1) return null

  return (
    <nav className="bg-background/70 border-border sticky top-16 z-20 flex h-12 items-center gap-2 overflow-x-auto border-b px-6 backdrop-blur-xl">
      {sections.map((section) => (
        <a
          key={section.type}
          href={`#section-${section.type}`}
          className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors"
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
