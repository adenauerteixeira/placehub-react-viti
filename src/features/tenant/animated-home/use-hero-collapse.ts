import { useRef } from 'react'
import { useScroll } from 'motion/react'

/** scrollYProgress vai de 0 (topo, hero cheio) a 1 (hero totalmente rolado
 * pra fora) — só ao longo da altura do próprio hero (offset 'start start'
 * a 'end start'), não da página inteira. Fora desse intervalo o valor fica
 * "travado" em 0 ou 1 (comportamento padrão do useTransform), que é
 * exatamente o "recolhe e fica assim" pedido. */
export function useHeroCollapse() {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  return { heroRef, scrollYProgress }
}
