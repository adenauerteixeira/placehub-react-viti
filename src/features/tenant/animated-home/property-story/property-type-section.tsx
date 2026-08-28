import { useMemo, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  announcementImageUrl,
  type Announcement,
  type AnnouncementImage,
  type PropertyType,
} from '@/features/announcements/api'
import { AnimatedAnnouncementCard } from '../animated-announcement-card'
import { CategoryTitle } from './category-title'
import { PropertyStory } from './property-story'
import { collageSlotFor } from './property-story-variants'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
// Barra de endereço do Safari iOS mostrando/escondendo dispara resize —
// sem isso, o ScrollTrigger re-mede (e "pisca" o pin) no meio da rolagem.
ScrollTrigger.config({ ignoreMobileResize: true })

const MAX_PHOTOS = 6
const TITLE_SETTLE = 500
// Fotos secundárias sobem de baixo pra tela toda de uma vez (leve stagger
// entre elas) e pousam nos slots da colagem — não é mais um baralho
// sequencial foto-a-foto, é um único evento de montagem. Ease com
// "overshoot" (back.out) pra sensação de peso/pouso, bem perceptível.
const COLLAGE_ENTER_DURATION = 500
const COLLAGE_STAGGER = 55
// Capa + cartão sobem juntos ("<") logo depois — pro primeiro imóvel da
// categoria, esse slot começa na metade do TITLE_SETTLE (se sobrepõe ao
// encolhimento do título), então dá pra ir direto no "Ver imóvel" sem
// esperar a colagem toda se montar.
const COVER_REVEAL = 450
const CARD_REVEAL = 450
const CARD_DELAY_AFTER_COVER = 120
const COLLAGE_TAIL_OVERLAP = 0.45
const HOLD = 450
const EXIT = 300

/** Duração total (mesma unidade dos tweens acima, ~px de rolagem) da
 * categoria inteira — espelha em números puros exatamente a mesma
 * matemática de posições relativas usada dentro de buildTimeline (colagem →
 * capa+cartão sobrepostos → hold → saída, item após item). Pré-calculado
 * porque `end` só pode ser resolvido de forma confiável ANTES do
 * ScrollTrigger nascer: um `end` como função reavaliada depois (no refresh)
 * chega a rodar antes da variável `tl` ser atribuída — end vira "+=0" e
 * nunca mais corrige o tamanho do pin-spacer. */
function totalScrollUnits(items: Announcement[], photos: Record<string, unknown[]>) {
  let cursor = TITLE_SETTLE / 2 // primeiro imóvel entra sobrepondo a metade final do encolhimento do título
  for (const item of items) {
    const secondaryCount = Math.max((photos[item.id]?.length ?? 1) - 1, 0)
    const collageSpan =
      secondaryCount > 0 ? COLLAGE_ENTER_DURATION + COLLAGE_STAGGER * (secondaryCount - 1) : 0
    const coverStart = cursor + collageSpan * (1 - COLLAGE_TAIL_OVERLAP)
    const coverCardEnd =
      coverStart + Math.max(COVER_REVEAL, CARD_DELAY_AFTER_COVER + CARD_REVEAL)
    cursor = coverCardEnd + HOLD + EXIT
  }
  return Math.max(cursor, TITLE_SETTLE)
}

/** Uma categoria inteira: um único ScrollTrigger com pin na seção inteira +
 * uma única timeline sequenciando o encolhimento do título e, por imóvel,
 * fotos entrando em deck → cartão de vidro → hold → saída. O pin em si é o
 * que faz o título "ficar" fixo no canto depois de encolher — ele nunca é
 * re-tocado depois, então some fixo enquanto a seção segura a tela. Nunca
 * pina e anima o mesmo nó: o pin é no wrapper (`sectionRef`), o encolhimento
 * roda no título (`titleRef`), um descendente. */
export function PropertyTypeSection({
  type,
  label,
  items,
  galleries,
  topOffset,
  showParticles,
}: {
  type: PropertyType
  label: string
  items: Announcement[]
  galleries: Record<string, AnnouncementImage[]>
  /** Px ocupados por cabeçalho + (se houver) barra de categorias sticky
   * acima desta seção — usado tanto pro início do pin quanto pra altura da
   * seção, senão o topo de cada categoria nasce coberto por esse chrome. */
  topOffset: number
  /** Fundo de partículas (sempre escuro) visível por trás da seção — usado
   * pra forçar texto claro no título, já que ele não tem painel de fundo
   * próprio pra garantir contraste sozinho. */
  showParticles: boolean
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  const counterRef = useRef<HTMLDivElement | null>(null)
  const wrapperRefs = useRef(new Map<string, HTMLDivElement>())
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const photoRefs = useRef(new Map<string, HTMLImageElement[]>())

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const galleriesReady = items.every((item) => galleries[item.id] !== undefined)

  const propertyPhotos = useMemo(() => {
    const map: Record<string, { url: string; alt: string }[]> = {}
    for (const item of items) {
      const images = galleries[item.id] ?? []
      map[item.id] = images
        .slice(0, MAX_PHOTOS)
        .map((image) => ({ url: announcementImageUrl(image.path), alt: item.title }))
    }
    return map
  }, [items, galleries])

  useGSAP(
    () => {
      if (reducedMotion || !galleriesReady || !sectionRef.current) return

      const section = sectionRef.current

      function buildTimeline(desktop: boolean) {
        const totalUnits = totalScrollUnits(items, propertyPhotos)

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            pin: true,
            start: 'top top+=' + topOffset,
            end: '+=' + totalUnits,
            scrub: 1,
          },
        })

        tl.fromTo(
          titleRef.current,
          { scale: 1.6, x: '18vw', y: '18vh' },
          { scale: 1, x: 0, y: 0, ease: 'power2.out', duration: TITLE_SETTLE },
          0,
        )

        items.forEach((item, itemIndex) => {
          const wrapper = wrapperRefs.current.get(item.id)
          const card = cardRefs.current.get(item.id)
          const photos = photoRefs.current.get(item.id) ?? []
          if (!wrapper || !card) return

          // Só o primeiro imóvel da categoria se sobrepõe ao encolhimento
          // do título (começa na metade dele); os demais entram na sequência
          // normal, logo após a saída do imóvel anterior.
          const entryPosition = itemIndex === 0 ? TITLE_SETTLE / 2 : undefined

          tl.set(
            wrapper,
            { autoAlpha: 1, pointerEvents: 'auto', attr: { 'aria-hidden': 'false' } },
            entryPosition,
          )
          tl.call(
            () => {
              if (!counterRef.current) return
              counterRef.current.textContent = `${String(itemIndex + 1).padStart(2, '0')}/${items.length}`
              counterRef.current.style.opacity = '1'
            },
            undefined,
            entryPosition,
          )

          // Fotos secundárias: sobem de baixo da tela juntas (leve stagger)
          // e pousam nos slots da colagem, ao fundo. Em mobile os slots
          // ficam mais próximos do centro (a tela é estreita, um espalhado
          // igual ao desktop jogaria foto pra fora da área visível).
          const secondaryPhotos = photos.slice(1).filter((el): el is HTMLImageElement => !!el)
          const spread = desktop ? 1 : 0.68
          const riseFrom = desktop ? 260 : 180
          if (secondaryPhotos.length > 0) {
            tl.fromTo(
              secondaryPhotos,
              {
                autoAlpha: 0,
                y: riseFrom,
                xPercent: (i: number) => collageSlotFor(i + 1).xPercent * spread,
                yPercent: (i: number) => collageSlotFor(i + 1).yPercent * spread,
                rotation: (i: number) => collageSlotFor(i + 1).rotation * 0.3,
                scale: (i: number) => collageSlotFor(i + 1).scale * 0.85,
              },
              {
                autoAlpha: 1,
                y: 0,
                xPercent: (i: number) => collageSlotFor(i + 1).xPercent * spread,
                yPercent: (i: number) => collageSlotFor(i + 1).yPercent * spread,
                rotation: (i: number) => collageSlotFor(i + 1).rotation,
                scale: (i: number) => collageSlotFor(i + 1).scale,
                ease: 'back.out(1.5)',
                duration: COLLAGE_ENTER_DURATION,
                stagger: COLLAGE_STAGGER,
              },
              entryPosition,
            )
          }

          // Capa + cartão sobem por cima, em primeiro plano, logo depois —
          // começa já perto do fim da montagem da colagem (mesmo evento,
          // não uma etapa nova), e sempre no centro (a colagem é que fica
          // espalhada ao redor). Sem fotos secundárias, entra junto com o
          // resto do slot do imóvel.
          const collageSpan =
            secondaryPhotos.length > 0
              ? COLLAGE_ENTER_DURATION + COLLAGE_STAGGER * (secondaryPhotos.length - 1)
              : 0
          const coverPosition =
            secondaryPhotos.length > 0
              ? `-=${collageSpan * COLLAGE_TAIL_OVERLAP}`
              : entryPosition
          if (photos[0]) {
            tl.fromTo(
              photos[0],
              { autoAlpha: 0, y: riseFrom, scale: 0.9 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                rotation: 0,
                ease: 'back.out(1.3)',
                duration: COVER_REVEAL,
              },
              coverPosition,
            )
          }
          tl.fromTo(
            card,
            { autoAlpha: 0, y: 40, scale: 0.97, filter: 'blur(8px)' },
            { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'power2.out', duration: CARD_REVEAL },
            `<+=${CARD_DELAY_AFTER_COVER}`,
          )

          tl.to({}, { duration: HOLD }) // pausa — dá tempo/rolagem pra ler

          tl.to([...photos, card], { autoAlpha: 0, y: -30, duration: EXIT, ease: 'power1.in' })
          tl.set(wrapper, { autoAlpha: 0, pointerEvents: 'none', attr: { 'aria-hidden': 'true' } })
        })
      }

      ScrollTrigger.matchMedia({
        '(min-width: 1024px)': () => buildTimeline(true),
        '(max-width: 1023px)': () => buildTimeline(false),
      })

      document.fonts?.ready?.then(() => ScrollTrigger.refresh())
    },
    {
      scope: sectionRef as React.RefObject<HTMLElement>,
      dependencies: [galleriesReady, reducedMotion, type, topOffset],
    },
  )

  if (reducedMotion) {
    return (
      <section id={`section-${type}`} className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Categoria
          </p>
          <h2 className="text-3xl font-semibold">{label}</h2>
        </div>
        <div className="flex flex-col gap-10">
          {items.map((item) => (
            <AnimatedAnnouncementCard
              key={item.id}
              announcement={item}
              coverUrl={propertyPhotos[item.id]?.[0]?.url ?? null}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      id={`section-${type}`}
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ height: `calc(100dvh - ${topOffset}px)` }}
    >
      <CategoryTitle ref={titleRef} label={label} count={items.length} onParticles={showParticles} />
      {items.length > 1 && (
        <div
          ref={counterRef}
          className="text-muted-foreground bg-background/70 border-border pointer-events-none absolute top-5 right-6 rounded-full border px-3 py-1 text-sm font-medium tabular-nums opacity-0 backdrop-blur-xl sm:top-6 sm:right-10"
        >
          {`01/${items.length}`}
        </div>
      )}
      <div className="absolute inset-0">
        {items.map((item) => (
          <PropertyStory
            key={item.id}
            announcement={item}
            photos={propertyPhotos[item.id] ?? []}
            registerWrapperRef={(el) => {
              if (el) wrapperRefs.current.set(item.id, el)
              else wrapperRefs.current.delete(item.id)
            }}
            registerPhotoRef={(index, el) => {
              const arr = photoRefs.current.get(item.id) ?? []
              if (el) arr[index] = el
              else delete arr[index]
              photoRefs.current.set(item.id, arr)
            }}
            registerCardRef={(el) => {
              if (el) cardRefs.current.set(item.id, el)
              else cardRefs.current.delete(item.id)
            }}
          />
        ))}
      </div>
    </section>
  )
}
