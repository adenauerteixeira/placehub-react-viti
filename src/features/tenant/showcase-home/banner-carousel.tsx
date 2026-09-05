import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { bannerAdImageUrl, type BannerAd } from '@/features/tenant-banner-ads/api'
import type { Tenant } from '@/features/tenants/api'
import { OwnPromoSlide } from '../own-promo-slide'
import { PromoSlide } from '../promo-slide'

function AdSlide({
  ad,
  showBorder,
  badgeOpacity,
  badgePosition,
}: {
  ad: BannerAd
  showBorder: boolean
  badgeOpacity: number
  badgePosition: 'top' | 'bottom'
}) {
  const imageUrl = bannerAdImageUrl(ad.image_path, ad.updated_at)

  return (
    <PromoSlide
      imageUrl={imageUrl}
      title={ad.title || ad.company_name}
      subtitle={ad.subtitle}
      subtitle2={ad.subtitle_2}
      linkUrl={ad.link_url}
      linkLabel={ad.link_label}
      showBorder={showBorder}
      imageFit={ad.image_fit}
      imageAlign={ad.image_align}
      backgroundColor={ad.background_color}
      badgePosition={badgePosition}
      badge={
        <Badge variant="secondary" style={{ opacity: badgeOpacity }}>
          Publicidade
        </Badge>
      }
    />
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
export function BannerCarousel({
  tenant,
  ads,
  controlsAtBottom = false,
}: {
  tenant: Tenant
  ads: BannerAd[]
  /** A Vitrine Premium sobrepõe um cabeçalho fixo ao próprio banner (hero
   * full-bleed) — sem isso, o botão de pausa e o selo "Publicidade" (que
   * assumem canto superior livre) brigam com "Entrar"/tema no cabeçalho. */
  controlsAtBottom?: boolean
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const targetIndexRef = useRef(0)
  const [manuallyPaused, setManuallyPaused] = useState(false)

  const realSlides = [
    ...(tenant.public_hero_own_active
      ? [
          {
            id: 'own',
            node: <OwnPromoSlide tenant={tenant} showBorder={tenant.public_hero_show_border} />,
            seconds: tenant.public_hero_display_seconds ?? tenant.public_hero_autoplay_seconds,
          },
        ]
      : []),
    ...ads.map((ad) => ({
      id: ad.id,
      node: (
        <AdSlide
          ad={ad}
          showBorder={tenant.public_hero_show_border}
          badgeOpacity={tenant.public_hero_badge_opacity}
          badgePosition={controlsAtBottom ? 'bottom' : 'top'}
        />
      ),
      seconds: ad.display_seconds ?? tenant.public_hero_autoplay_seconds,
    })),
  ]
  const loop = realSlides.length > 1
  const durationsKey = realSlides.map((s) => s.seconds).join(',')

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

  // Duração por slide: em vez de um `setInterval` de cadência fixa, cada
  // disparo olha a duração do slide ATUAL (própria ou de patrocinador,
  // convertendo o índice com clone pro índice real) e se reagenda sozinho
  // com um `setTimeout` do tamanho certo antes de avançar pro próximo.
  useEffect(() => {
    if (!loop || manuallyPaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const direction = tenant.public_hero_autoplay_reverse ? -1 : 1
    let timeoutId: number

    function schedule() {
      const realIndex =
        ((targetIndexRef.current - 1) % realSlides.length + realSlides.length) % realSlides.length
      const seconds = realSlides[realIndex]?.seconds ?? tenant.public_hero_autoplay_seconds
      timeoutId = window.setTimeout(() => {
        advance(direction)
        schedule()
      }, seconds * 1000)
    }
    schedule()

    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, manuallyPaused, durationsKey, tenant.public_hero_autoplay_seconds, tenant.public_hero_autoplay_reverse])

  if (realSlides.length === 0) return null

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
        // bg-transparent (não bg-background) de propósito: com o padding
        // por slide (abaixo), um fundo opaco aqui aparecia como uma mancha
        // quadrada atrás da quina arredondada de cada slide — mais visível
        // ainda com "fixo no topo ao rolar" ligado.
        tenant.public_hero_sticky ? 'sticky top-0 z-10 bg-transparent' : 'relative',
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
          // px-2.5 (10px) só aqui, não no scroller acima — descola o slide
          // das laterais sem mexer na largura do "passo" que o carrossel usa
          // pra rolar (a div ocupa 100% do espaço do scroller de qualquer
          // forma; o padding só encolhe a área de conteúdo por dentro).
          <div key={slide.key} className="w-full shrink-0 snap-center px-2.5">
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
          className={cn(
            'absolute right-2 z-10 rounded-full opacity-40 transition-opacity hover:opacity-90',
            controlsAtBottom ? 'bottom-14' : 'top-2',
          )}
          onClick={() => setManuallyPaused((prev) => !prev)}
          aria-label={manuallyPaused ? 'Retomar rotação automática' : 'Pausar rotação automática'}
        >
          {manuallyPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </Button>
      )}
    </div>
  )
}
