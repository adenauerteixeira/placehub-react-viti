import type { Announcement } from '@/features/announcements/api'
import { PropertyGallery } from './property-gallery'
import { PropertyGlassCard } from './property-glass-card'

/** Um imóvel inteiro dentro da categoria: galeria + cartão de vidro,
 * empilhado em `position: absolute; inset: 0` sobre os outros imóveis da
 * mesma categoria (só um fica "ativo" — opacity/pointer-events ligados pelo
 * GSAP timeline do pai enquanto é a vez dele). `aria-hidden`/pointer-events
 * começam desligados via CSS; o GSAP alterna via `attr`/`pointerEvents` no
 * momento certo. */
export function PropertyStory({
  announcement,
  photos,
  registerWrapperRef,
  registerPhotoRef,
  registerCardRef,
}: {
  announcement: Announcement
  photos: { url: string; alt: string }[]
  registerWrapperRef: (el: HTMLDivElement | null) => void
  registerPhotoRef: (index: number, el: HTMLImageElement | null) => void
  registerCardRef: (el: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={registerWrapperRef}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 pb-12 opacity-0 sm:pb-16"
      aria-hidden="true"
    >
      <PropertyGallery
        photos={photos}
        title={announcement.title}
        slug={announcement.slug}
        registerPhotoRef={registerPhotoRef}
      />
      <PropertyGlassCard ref={registerCardRef} announcement={announcement} />
    </div>
  )
}
