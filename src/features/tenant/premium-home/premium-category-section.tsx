import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { announcementImageUrl } from '@/features/announcements/api'
import { PROPERTY_TYPE_ICONS, type AnnouncementSection } from '@/features/announcements/labels'
import { PremiumAnnouncementCard } from './premium-announcement-card'

/** Âncora usada pela nav de categorias (pills) pra rolar até cada seção. */
export function categorySectionId(type: string) {
  return `premium-section-${type}`
}

/** Cascata só faz sentido pros primeiros cards (os demais já nascem fora da
 * tela e entram sozinhos ao rolar) — cap evita atraso crescente sem fim numa
 * categoria com dezenas de itens. */
const MAX_STAGGERED_CARDS = 5
const STAGGER_STEP = 0.06

/** Distância (px) restante até a ancoragem em que ícone/contagem/fundo
 * começam a aparecer. */
const REVEAL_DISTANCE = 20

function clampProgress(value: number, from: number, to: number): number {
  const raw = (value - from) / (to - from)
  return Math.min(1, Math.max(0, raw))
}

/** Posição (`top`, em px, relativa à viewport) do topo natural do título —
 * "natural" porque é medida num marcador comum (não sticky) que fica
 * exatamente onde o título ficaria se não fosse ancorado; assim continua
 * decrescendo com o scroll mesmo depois do título de verdade já ter
 * grudado. Vem junto com a altura da viewport, porque os limiares do efeito
 * são definidos como % da altura da tela (ver CategoryHeroTitle). */
function useElementTop() {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState({ top: Infinity, viewportHeight: 900 })

  useEffect(() => {
    function update() {
      if (!ref.current) return
      setState({ top: ref.current.getBoundingClientRect().top, viewportHeight: window.innerHeight })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return { ref, ...state }
}

/** Título "hero" de cada categoria, em fases conforme a página rola por
 * baixo do cabeçalho fixo — todos os limiares abaixo são medidos a partir da
 * posição real do título na tela (`top`, em px), não de um trecho arbitrário
 * de scroll:
 * 1. Nasce centralizado na largura da barra (≈ centro da tela) só com o
 *    nome a 3rem — sem ícone, contagem ou fundo — e ganha opacidade total
 *    assim que entra a 85% da altura da tela (contando de cima; é o mesmo
 *    que "15% de baixo pra cima").
 * 2. Segue parado, ainda centralizado, até chegar a 75% da altura da tela
 *    ("25% de baixo pra cima").
 * 3. Daí em diante encolhe e migra da centralização pro canto superior
 *    esquerdo (onde vai ficar ancorado — a posição vertical em si já vem de
 *    graça do scroll normal + do sticky, não precisa ser animada); só nos
 *    últimos 20px reais até a ancoragem é que ícone (sem círculo de fundo),
 *    contagem de imóveis e um fundo em gradiente (cor do tema à esquerda →
 *    transparente a partir da metade) vão aparecendo, terminando exatamente
 *    quando "pousa". Uma vez ancorado, fica sticky enquanto os cards dessa
 *    categoria passam por baixo — só desgruda quando a próxima categoria
 *    começa a sua. Some com `prefers-reduced-motion`, caindo direto no
 *    título já "pousado". */
function CategoryHeroTitle({
  section,
  stickyBelowNav,
}: {
  section: AnnouncementSection
  /** A barra de pills de categoria (`PremiumCategoryNav`) também é sticky em
   * `top-16` — sem esse deslocamento extra, o título grudaria por cima dela.
   * Só existe (e só faz diferença) quando há mais de uma categoria. */
  stickyBelowNav: boolean
}) {
  const { ref: zoneRef, top, viewportHeight } = useElementTop()
  const Icon = PROPERTY_TYPE_ICONS[section.type]
  const reduceMotion = useReducedMotion()
  const countLabel = `${section.items.length} ${section.items.length === 1 ? 'imóvel' : 'imóveis'}`

  const barRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLHeadingElement>(null)
  const [centerOffset, setCenterOffset] = useState(0)

  useLayoutEffect(() => {
    function measure() {
      if (!barRef.current || !measureRef.current) return
      const barWidth = barRef.current.getBoundingClientRect().width
      const textWidth = measureRef.current.getBoundingClientRect().width
      setCenterOffset(Math.max(0, (barWidth - textWidth) / 2))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [section.label])

  if (reduceMotion) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{ background: 'linear-gradient(to right, var(--primary), transparent 50%)' }}
      >
        <span className="text-primary flex size-11 shrink-0 items-center justify-center sm:size-12">
          <Icon className="size-6 sm:size-7" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight whitespace-nowrap">{section.label}</h2>
          <p className="text-muted-foreground text-sm">{countLabel}</p>
        </div>
      </div>
    )
  }

  const anchorPx = stickyBelowNav ? 120 : 64
  const nameOpacity = clampProgress(top, viewportHeight, viewportHeight * 0.85)
  const moveProgress = clampProgress(top, viewportHeight * 0.75, anchorPx)
  const revealOpacity = clampProgress(top, anchorPx + REVEAL_DISTANCE, anchorPx)
  const x = centerOffset * (1 - moveProgress)
  const fontSize = 3 - 1.75 * moveProgress

  return (
    <>
      <div ref={zoneRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-0" />
      <div className={cn('sticky z-10', stickyBelowNav ? 'top-[120px]' : 'top-16')}>
        <div ref={barRef} className="relative w-full overflow-hidden rounded-2xl">
          <h2
            ref={measureRef}
            aria-hidden
            className="invisible absolute font-semibold whitespace-nowrap"
            style={{ fontSize: '3rem' }}
          >
            {section.label}
          </h2>

          <div style={{ opacity: revealOpacity }} className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, var(--primary), transparent 50%)' }}
            />
          </div>

          <div style={{ transform: `translateX(${x}px)` }} className="flex items-center gap-3 p-4">
            <span
              style={{ opacity: revealOpacity }}
              className="text-primary flex size-11 shrink-0 items-center justify-center sm:size-12"
            >
              <Icon className="size-6 sm:size-7" />
            </span>
            <div>
              <h2
                style={{ opacity: nameOpacity, fontSize: `${fontSize}rem` }}
                className="font-semibold tracking-tight whitespace-nowrap"
              >
                {section.label}
              </h2>
              <p style={{ opacity: revealOpacity }} className="text-muted-foreground text-sm">
                {countLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function PremiumCategorySection({
  section,
  covers,
  isFavorite,
  onToggleFavorite,
  isFirst = false,
  hasCategoryNav,
}: {
  section: AnnouncementSection
  covers: Record<string, string> | undefined
  isFavorite: (announcementId: string) => boolean
  onToggleFavorite: (announcementId: string) => void
  isFirst?: boolean
  hasCategoryNav: boolean
}) {
  return (
    <section id={categorySectionId(section.type)} className="relative flex scroll-mt-32 flex-col gap-10">
      <CategoryHeroTitle section={section} stickyBelowNav={hasCategoryNav} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((announcement, index) => {
          const coverPath = covers?.[announcement.id]
          return (
            <PremiumAnnouncementCard
              key={announcement.id}
              announcement={announcement}
              coverUrl={coverPath ? announcementImageUrl(coverPath) : null}
              isFavorite={isFavorite(announcement.id)}
              onToggleFavorite={() => onToggleFavorite(announcement.id)}
              revealDelay={isFirst ? Math.min(index, MAX_STAGGERED_CARDS) * STAGGER_STEP : 0}
            />
          )
        })}
      </div>
    </section>
  )
}
