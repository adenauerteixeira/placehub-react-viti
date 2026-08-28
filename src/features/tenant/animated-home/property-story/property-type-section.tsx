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
import { photoOffsetFor, PROPERTY_TYPE_STORY_VARIANTS } from './property-story-variants'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
// Barra de endereço do Safari iOS mostrando/escondendo dispara resize —
// sem isso, o ScrollTrigger re-mede (e "pisca" o pin) no meio da rolagem.
ScrollTrigger.config({ ignoreMobileResize: true })

const MAX_PHOTOS = 6
const TITLE_SETTLE = 500
const PHOTO_STEP = 350
const CARD_REVEAL = 450
const HOLD = 350
const EXIT = 300

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
}: {
  type: PropertyType
  label: string
  items: Announcement[]
  galleries: Record<string, AnnouncementImage[]>
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
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

      const variant = PROPERTY_TYPE_STORY_VARIANTS[type]
      const section = sectionRef.current

      function buildTimeline(desktop: boolean) {
        let totalUnits = TITLE_SETTLE
        for (const item of items) {
          const count = Math.max(propertyPhotos[item.id]?.length ?? 0, 1)
          const photoBudget = count * (desktop ? PHOTO_STEP : PHOTO_STEP * 0.65)
          totalUnits += photoBudget + CARD_REVEAL + HOLD + EXIT
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            pin: true,
            start: 'top top+=64',
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

        for (const item of items) {
          const wrapper = wrapperRefs.current.get(item.id)
          const card = cardRefs.current.get(item.id)
          const photos = photoRefs.current.get(item.id) ?? []
          if (!wrapper || !card) continue

          tl.set(wrapper, { autoAlpha: 1, pointerEvents: 'auto', attr: { 'aria-hidden': 'false' } })
          if (photos[0]) {
            tl.set(photos[0], { autoAlpha: 1, xPercent: 0, yPercent: 0, rotation: 0, scale: 1 })
          }

          photos.forEach((photoEl, index) => {
            if (index === 0) return
            const offset = photoOffsetFor(index, variant)
            tl.fromTo(
              photoEl,
              {
                autoAlpha: 0,
                xPercent: desktop ? offset.xPercent * 1.3 : 0,
                yPercent: desktop ? offset.yPercent : 14,
                rotation: 0,
                scale: 0.96,
              },
              {
                autoAlpha: 1,
                xPercent: desktop ? offset.xPercent : 0,
                yPercent: desktop ? offset.yPercent : 0,
                rotation: desktop ? offset.rotation : 0,
                scale: offset.scale,
                ease: 'power2.out',
                duration: desktop ? PHOTO_STEP : PHOTO_STEP * 0.65,
              },
            )
          })

          tl.fromTo(
            card,
            { autoAlpha: 0, y: 40, scale: 0.97, filter: 'blur(8px)' },
            { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'power2.out', duration: CARD_REVEAL },
          )

          tl.to({}, { duration: HOLD }) // pausa — dá tempo/rolagem pra ler

          tl.to([...photos, card], { autoAlpha: 0, y: -30, duration: EXIT, ease: 'power1.in' })
          tl.set(wrapper, { autoAlpha: 0, pointerEvents: 'none', attr: { 'aria-hidden': 'true' } })
        }
      }

      ScrollTrigger.matchMedia({
        '(min-width: 1024px)': () => buildTimeline(true),
        '(max-width: 1023px)': () => buildTimeline(false),
      })

      document.fonts?.ready?.then(() => ScrollTrigger.refresh())
    },
    { scope: sectionRef as React.RefObject<HTMLElement>, dependencies: [galleriesReady, reducedMotion, type] },
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
      className="relative h-[calc(100dvh-4rem)] overflow-hidden"
    >
      <CategoryTitle ref={titleRef} label={label} count={items.length} />
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
