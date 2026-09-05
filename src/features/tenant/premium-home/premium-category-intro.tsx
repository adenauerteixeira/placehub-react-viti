import { PROPERTY_TYPE_ICONS, type AnnouncementSection } from '@/features/announcements/labels'
import { categorySectionId } from './premium-category-section'

/** Grade de cards grandes (ícone + nome + quantidade — mesma informação das
 * pills), entre a busca e o selo "Role para explorar" (ver
 * `PremiumScrollCue`), dentro do mesmo contêiner `min-h-screen` do hero (ver
 * `premium-home-page.tsx`). Existe pra dar "espaço de rolagem" antes da
 * primeira categoria: sem isso, ela nasce alta demais na página e a
 * animação "Hero" do título dela não tem distância suficiente pra rodar por
 * inteiro (as demais categorias, mais abaixo, não têm esse problema).
 *
 * `flex-1 min-h-0` é o que faz essa área absorver sozinha todo o espaço que
 * sobra entre o hero e o selo, SEM empurrar o selo pra baixo — ela nunca
 * força o contêiner a crescer além do tamanho da tela; se o espaço sobrando
 * for pequeno demais pra grade inteira (hero alto, tela baixa, ou muitas
 * categorias), essa mesma área ganha rolagem vertical própria em vez de
 * estourar. `min-h-0` é necessário porque um item flex, por padrão, não
 * encolhe além do tamanho do próprio conteúdo — sem isso o `overflow-y-auto`
 * não teria efeito nenhum. Ao passar por essa grade, a barra de pills
 * (sticky) e as categorias assumem normalmente, sem nenhuma transição
 * especial aqui. */
export function PremiumCategoryIntro({ sections }: { sections: AnnouncementSection[] }) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-4">
      <div className="grid w-full max-w-4xl grid-cols-2 gap-4 p-1 sm:grid-cols-4">
        {sections.map((section) => {
          const Icon = PROPERTY_TYPE_ICONS[section.type]
          return (
            <button
              key={section.type}
              type="button"
              onClick={() =>
                document.getElementById(categorySectionId(section.type))?.scrollIntoView({ behavior: 'smooth' })
              }
              className="ring-border flex flex-col items-center gap-3 rounded-2xl bg-card p-6 shadow-sm ring-1 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-full shadow-md">
                <Icon className="size-7" />
              </span>
              <div className="text-center">
                <p className="font-semibold whitespace-nowrap">{section.label}</p>
                <p className="text-muted-foreground text-sm">
                  {section.items.length} {section.items.length === 1 ? 'imóvel' : 'imóveis'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
