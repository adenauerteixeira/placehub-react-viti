import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const INTRO_FADE_MS = 700
const STORAGE_PREFIX = 'placehub-premium-home-intro-seen:'

export type PremiumHomeIntroPhase = 'intro' | 'fading' | 'done'
export type PremiumHomeIntroReplay = 'once_per_session' | 'always'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function hasSeenIntro(storageKey: string) {
  try {
    return sessionStorage.getItem(storageKey) === '1'
  } catch {
    return false
  }
}

function markIntroSeen(storageKey: string) {
  try {
    sessionStorage.setItem(storageKey, '1')
  } catch {
    // Modo privado ou storage bloqueado — sem persistência, a intro só
    // reaparece na próxima abertura da aba, o que é uma degradação aceitável.
  }
}

/** Orquestra a fase da intro animada da home Premium: desenha o logo, segura
 * `durationSeconds` (tempo total até começar a esmaecer — não dá pra medir
 * quando a animação embutida no SVG do tenant termina de verdade, então
 * esse número, configurável em Identidade Visual, é quem manda) e então
 * esmaece — sinaliza 'done' pra quem chama trocar pelo conteúdo real (grade
 * de categorias, selo de rolar, botão do WhatsApp). Com
 * `replay: 'once_per_session'`, toca uma única vez por aba (sessionStorage
 * por tenant); com 'always', toca em toda abertura da home. Pulada de cara
 * com `prefers-reduced-motion: reduce`, nos dois casos. */
export function usePremiumHomeIntroPhase(
  enabled: boolean,
  tenantId: string,
  replay: PremiumHomeIntroReplay,
  durationSeconds: number,
): PremiumHomeIntroPhase {
  const storageKey = STORAGE_PREFIX + tenantId
  const [phase, setPhase] = useState<PremiumHomeIntroPhase>('done')
  const [decidedFor, setDecidedFor] = useState<string | null>(null)

  // `enabled` só fica true depois que o tenant/anúncios carregam (a home
  // começa em loading, sem `showCategoryIntro` nenhum pra decidir), então a
  // decisão não pode ir num useState inicial — ele só roda no primeiríssimo
  // render, antes dos dados chegarem. Em vez de decidir num efeito (que
  // committaria o DOM com a fase errada por um instante antes de corrigir,
  // disparando sem querer a transição de opacidade do conteúdo real — dois
  // commits de opacidade em sequência é o gatilho clássico de transição
  // CSS), a decisão roda durante o próprio render assim que `enabled` fica
  // true: React aplica esse setState e re-renderiza antes de montar
  // qualquer coisa na tela, então o DOM só é commitado uma vez, já com a
  // fase final.
  if (enabled && decidedFor !== storageKey) {
    setDecidedFor(storageKey)
    const alreadySeen = replay === 'once_per_session' && hasSeenIntro(storageKey)
    setPhase(!prefersReducedMotion() && !alreadySeen ? 'intro' : 'done')
  }

  useEffect(() => {
    if (phase !== 'intro') return
    const timer = setTimeout(() => setPhase('fading'), durationSeconds * 1000)
    return () => clearTimeout(timer)
  }, [phase, durationSeconds])

  useEffect(() => {
    if (phase !== 'fading') return
    const timer = setTimeout(() => {
      if (replay === 'once_per_session') markIntroSeen(storageKey)
      setPhase('done')
    }, INTRO_FADE_MS)
    return () => clearTimeout(timer)
  }, [phase, storageKey, replay])

  return phase
}

/** Camada da intro em si — o SVG do tenant desenhando-se (se o arquivo tiver
 * animação CSS embutida; senão só aparece estático mesmo), centralizado e
 * limitado ao espaço do contêiner do chamador (por isso não define altura
 * própria: quem chama já tem o tamanho certo, o mesmo ocupado pela grade de
 * categorias + selo de rolar). No tema escuro, uma logo desenhada pra
 * contraste sobre claro costuma perder legibilidade sobre fundo escuro —
 * uma placa (cor configurável em Identidade Visual, `home_intro_backdrop_color`,
 * hex com alfa opcional) atrás resolve sem depender de uma versão
 * alternativa do arquivo. */
export function PremiumHomeIntroOverlay({
  svgUrl,
  dark,
  backdropColor,
  phase,
}: {
  svgUrl: string
  dark: boolean
  backdropColor: string
  phase: PremiumHomeIntroPhase
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 grid place-items-center p-6 transition-opacity ease-out',
        phase === 'fading' ? 'opacity-0 duration-700' : 'opacity-100 duration-0',
      )}
    >
      {dark && (
        <div
          className="h-full max-h-[80%] w-full max-w-3xl rounded-3xl shadow-2xl [grid-area:1/1]"
          style={{ backgroundColor: backdropColor }}
        />
      )}
      <img src={svgUrl} alt="" className="h-auto max-h-full w-full max-w-2xl [grid-area:1/1]" />
    </div>
  )
}
