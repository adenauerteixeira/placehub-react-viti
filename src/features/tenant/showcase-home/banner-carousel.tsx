import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { bannerAdImageUrl, type BannerAd } from '@/features/tenant-banner-ads/api'
import type { Tenant } from '@/features/tenants/api'
import { OwnPromoSlide } from '../own-promo-slide'

function AdSlide({ ad, showBorder }: { ad: BannerAd; showBorder: boolean }) {
  const imageUrl = bannerAdImageUrl(ad.image_path, ad.updated_at)

  const content = (
    <section
      className={cn(
        'relative flex min-h-56 flex-col justify-end overflow-hidden rounded-2xl p-6 text-white sm:min-h-64 sm:p-10',
        showBorder && 'border',
      )}
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={ad.company_name} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
        />
      )}
      <Badge variant="secondary" className="absolute top-4 right-4">
        Publicidade
      </Badge>
      <h2 className="relative text-xl font-semibold sm:text-2xl">{ad.company_name}</h2>
    </section>
  )

  if (!ad.link_url) return content

  return (
    <a href={ad.link_url} target="_blank" rel="noreferrer sponsored" className="block">
      {content}
    </a>
  )
}

/** Mede a largura real de um slide (não `clientWidth` do contêiner, que
 * inclui o padding do modo full-width e ficaria maior que o slide de
 * verdade) + o gap entre slides — é isso que garante cada slide isolado,
 * sem pedaço do vizinho aparecendo, e a rolagem parando exatamente no
 * próximo. */
function measureStep(scroller: HTMLDivElement): number {
  const first = scroller.firstElementChild as HTMLElement | null
  if (!first) return scroller.clientWidth
  const gap = parseFloat(getComputedStyle(scroller).columnGap || '0') || 0
  return first.getBoundingClientRect().width + gap
}

/** Carrossel rolável do banner de destaque — slide próprio do tenant sempre
 * primeiro (nunca depende de anúncio pago pra aparecer), seguido dos
 * anúncios de parceiros ativos e dentro da vigência. Loop de verdade: um
 * clone do último slide antes do primeiro e um clone do primeiro depois do
 * último deixam a rolagem contínua na mesma direção; ao "assentar" num
 * clone, pulamos sem animação pro slide real correspondente — por isso o
 * pulo nunca é percebido. Avança sozinho (intervalo/sentido configuráveis);
 * o botão de pausa é o único jeito de parar — não pausa também no hover,
 * porque o próprio botão mora dentro da área do carrossel e o mouse
 * "hoverando" ele ao clicar em retomar faria parecer que não voltou a
 * girar. Desligado também se o visitante prefere menos animação. */
export function BannerCarousel({ tenant, ads }: { tenant: Tenant; ads: BannerAd[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const targetIndexRef = useRef(0)
  const [manuallyPaused, setManuallyPaused] = useState(false)

  const realSlides = [
    { id: 'own', node: <OwnPromoSlide tenant={tenant} showBorder={tenant.public_hero_show_border} /> },
    ...ads.map((ad) => ({ id: ad.id, node: <AdSlide ad={ad} showBorder={tenant.public_hero_show_border} /> })),
  ]
  const loop = realSlides.length > 1

  const domSlides = loop
    ? [
        { key: `clone-${realSlides[realSlides.length - 1].id}`, node: realSlides[realSlides.length - 1].node },
        ...realSlides.map((s) => ({ key: s.id, node: s.node })),
        { key: `clone-${realSlides[0].id}`, node: realSlides[0].node },
      ]
    : realSlides.map((s) => ({ key: s.id, node: s.node }))

  function goTo(index: number, behavior: ScrollBehavior) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: index * measureStep(el), behavior })
  }

  // Reseta a posição (sem animação) sempre que o número de slides muda —
  // cobre o caso dos anúncios chegando depois do primeiro render.
  // 'instant' de propósito — 'auto' não quer dizer "sem animação", quer
  // dizer "respeita o scroll-behavior do CSS" (que aqui é smooth).
  useLayoutEffect(() => {
    targetIndexRef.current = loop ? 1 : 0
    goTo(targetIndexRef.current, 'instant')
  }, [loop, realSlides.length])

  // Corrige a posição real depois que a rolagem (manual, por seta ou
  // automática) assenta — se parou num slide clonado, pula pro
  // correspondente de verdade sem transição visível.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || !loop) return

    let settleTimer: number
    function handleScroll() {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (!el) return
        const step = measureStep(el)
        if (step === 0) return
        const idx = Math.round(el.scrollLeft / step)
        const lastCloneIndex = domSlides.length - 1
        if (idx === lastCloneIndex) {
          targetIndexRef.current = 1
          goTo(1, 'instant')
        } else if (idx === 0) {
          targetIndexRef.current = realSlides.length
          goTo(realSlides.length, 'instant')
        } else {
          targetIndexRef.current = idx
        }
      }, 120)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.clearTimeout(settleTimer)
    }
  }, [loop, domSlides.length, realSlides.length])

  function advance(direction: 1 | -1) {
    targetIndexRef.current += direction
    goTo(targetIndexRef.current, 'smooth')
  }

  useEffect(() => {
    if (!loop || manuallyPaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const step = tenant.public_hero_autoplay_reverse ? -1 : 1
    const intervalId = window.setInterval(() => advance(step), tenant.public_hero_autoplay_seconds * 1000)
    return () => window.clearInterval(intervalId)
  }, [loop, manuallyPaused, tenant.public_hero_autoplay_seconds, tenant.public_hero_autoplay_reverse])

  return (
    // Largura total via margem negativa com calc(), não `left` +
    // `transform` — essa outra técnica de sangria depende de
    // `position: relative/absolute` pra funcionar, e isso conflitava com
    // `position: sticky` (o alcance do "gruda ao rolar" ficava preso à
    // altura do próprio carrossel em vez da página inteira). Margem não
    // depende de `position`, então convivem sem se atrapalhar no mesmo
    // elemento — e o "sticky" continua tendo o wrapper da página inteira
    // como referência de até onde pode grudar.
    <div
      className={cn(
        tenant.public_hero_sticky ? 'sticky top-0 z-10 bg-background' : 'relative',
        tenant.public_hero_full_width && 'ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] w-screen',
      )}
    >
      <div
        ref={scrollerRef}
        className={cn(
          // Sem padding aqui de propósito: com padding, o gap entre slides
          // fica visível dentro dessa folga e mostra um pedaço do slide
          // vizinho na borda — cada slide precisa ocupar exatamente a
          // largura visível, sem sobra nenhuma.
          'no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1',
        )}
      >
        {domSlides.map((slide) => (
          <div key={slide.key} className="w-full shrink-0 snap-center">
            {slide.node}
          </div>
        ))}
      </div>

      {loop && tenant.public_hero_show_arrows && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full sm:flex"
            onClick={() => advance(-1)}
            aria-label="Anúncio anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full sm:flex"
            onClick={() => advance(1)}
            aria-label="Próximo anúncio"
          >
            <ChevronRight className="size-4" />
          </Button>
        </>
      )}

      {loop && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="absolute top-2 right-2 z-10 rounded-full opacity-40 transition-opacity hover:opacity-90"
          onClick={() => setManuallyPaused((prev) => !prev)}
          aria-label={manuallyPaused ? 'Retomar rotação automática' : 'Pausar rotação automática'}
        >
          {manuallyPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </Button>
      )}
    </div>
  )
}
