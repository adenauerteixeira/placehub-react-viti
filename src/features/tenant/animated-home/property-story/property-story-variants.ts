import type { PropertyType } from '@/features/announcements/api'

// Config pura — NENHUM GSAP aqui. Timelines só podem nascer dentro da call
// stack síncrona do useGSAP() (property-type-section.tsx); um arquivo de
// config importado de qualquer lugar não pode criar nada que precise de
// contexto/cleanup do GSAP.

export type StoryEnterFrom = 'right' | 'alternate' | 'depth' | 'scale-parallax' | 'horizontal'

export type StoryVariant = {
  enterFrom: StoryEnterFrom
  /** Deslocamento horizontal entre uma foto e a próxima no deck, em % da
   * largura do palco — faixa pedida: 8–15%. */
  offsetXPercent: [number, number]
  /** Rotação leve por foto, em graus — faixa pedida: 1–3°. */
  rotationDeg: [number, number]
}

/** Casas / Apartamentos / Lotes / Chácaras / Comerciais, conforme pedido —
 * mesma linguagem visual, só a coreografia varia por tipo. `launch` e
 * `assignment` não estavam na lista original, então reaproveitam o estilo
 * de "Casas" como padrão razoável. */
export const PROPERTY_TYPE_STORY_VARIANTS: Record<PropertyType, StoryVariant> = {
  house: { enterFrom: 'right', offsetXPercent: [10, 14], rotationDeg: [1, 2] },
  apartment: { enterFrom: 'alternate', offsetXPercent: [8, 12], rotationDeg: [1, 2] },
  lot: { enterFrom: 'depth', offsetXPercent: [8, 10], rotationDeg: [1, 1.5] },
  farm: { enterFrom: 'scale-parallax', offsetXPercent: [9, 13], rotationDeg: [1, 3] },
  commercial: { enterFrom: 'horizontal', offsetXPercent: [12, 15], rotationDeg: [0, 1] },
  launch: { enterFrom: 'right', offsetXPercent: [10, 14], rotationDeg: [1, 2] },
  assignment: { enterFrom: 'right', offsetXPercent: [10, 14], rotationDeg: [1, 2] },
}

/** Quantos graus/percentuais usar pra foto de índice `index` (0 = capa,
 * sempre centralizada e sem deslocamento) — determinístico (mesmo anúncio
 * sempre produz o mesmo deck), não aleatório a cada render. */
export function photoOffsetFor(index: number, variant: StoryVariant) {
  if (index === 0) return { xPercent: 0, yPercent: 0, rotation: 0, scale: 1 }

  const [minX, maxX] = variant.offsetXPercent
  const [minR, maxR] = variant.rotationDeg
  const xStep = minX + ((maxX - minX) * (index % 3)) / 3
  const rotationMag = minR + ((maxR - minR) * (index % 2)) / 2
  const sign = index % 2 === 0 ? 1 : -1

  switch (variant.enterFrom) {
    case 'right':
      return { xPercent: xStep * index, yPercent: index * 1.5, rotation: rotationMag, scale: 1 - index * 0.015 }
    case 'alternate':
      return {
        xPercent: xStep * index * sign,
        yPercent: index * 1.5,
        rotation: rotationMag * sign,
        scale: 1 - index * 0.015,
      }
    case 'depth':
      return { xPercent: xStep * index * 0.5, yPercent: index * 2.5, rotation: rotationMag * 0.5, scale: 1 - index * 0.04 }
    case 'scale-parallax':
      return { xPercent: xStep * index * 0.7, yPercent: index * 2, rotation: rotationMag * sign, scale: 1 - index * 0.03 }
    case 'horizontal':
      return { xPercent: xStep * index * 1.2, yPercent: 0, rotation: rotationMag * 0.4 * sign, scale: 1 - index * 0.01 }
  }
}
