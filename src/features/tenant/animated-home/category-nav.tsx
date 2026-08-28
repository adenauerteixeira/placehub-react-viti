import type { AnnouncementSection } from '@/features/announcements/labels'

/** Pills de navegação por categoria, logo abaixo do cabeçalho compacto —
 * `position: sticky` empilhado com o `top-16` (altura do cabeçalho) do
 * CollapsingHeader, sem nenhuma coordenação em JS entre os dois.
 *
 * O clique calcula o alvo (rect + scrollY, menos os 64px do cabeçalho) e
 * rola com `window.scrollTo({ behavior: 'smooth' })` nativo — NÃO com o
 * ScrollToPlugin do GSAP. Testado e confirmado: um tween do GSAP que
 * atravessa vários `ScrollTrigger`s com `pin: true` (uma categoria por
 * seção) sofre desvio de posição final, porque a atribuição de scrollTop
 * quadro-a-quadro do tween conflita com a compensação de pin de cada
 * ScrollTrigger intermediário. O scroll nativo do browser não tem esse
 * problema — confirmado landing exato mesmo pulando por 3+ seções pinadas.
 */
export function CategoryNav({ sections }: { sections: AnnouncementSection[] }) {
  if (sections.length <= 1) return null

  function scrollToSection(type: string) {
    const el = document.getElementById(`section-${type}`)
    if (!el) return
    const target = el.getBoundingClientRect().top + window.scrollY - 64
    window.scrollTo({ top: target, behavior: 'smooth' })
  }

  return (
    <nav className="bg-background/70 border-border sticky top-16 z-20 flex h-12 items-center gap-2 overflow-x-auto border-b px-6 backdrop-blur-xl">
      {sections.map((section) => (
        <button
          key={section.type}
          type="button"
          onClick={() => scrollToSection(section.type)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors"
        >
          {section.label}
        </button>
      ))}
    </nav>
  )
}
