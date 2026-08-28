// Config pura — NENHUM GSAP aqui. Timelines só podem nascer dentro da call
// stack síncrona do useGSAP() (property-type-section.tsx); um arquivo de
// config importado de qualquer lugar não pode criar nada que precise de
// contexto/cleanup do GSAP.

export type CollageSlot = {
  /** % da largura própria da foto (GSAP xPercent) — desloca a partir do
   * centro, onde a capa fica. */
  xPercent: number
  yPercent: number
  rotation: number
  /** Fotos secundárias ficam bem menores que a capa — reforça a leitura de
   * "colagem ao fundo, capa em primeiro plano". */
  scale: number
}

// Cinco posições fixas ao redor do centro (onde a capa pousa por cima) —
// cobre os 4 cantos mais um topo, então até MAX_PHOTOS-1 fotos secundárias
// sempre têm um lugar sem se empilhar exatamente uma sobre a outra.
// Determinístico (mesmo anúncio sempre produz a mesma colagem), não
// aleatório a cada render.
const COLLAGE_SLOTS: CollageSlot[] = [
  { xPercent: -58, yPercent: -32, rotation: -9, scale: 0.42 },
  { xPercent: 54, yPercent: -30, rotation: 7, scale: 0.4 },
  { xPercent: -52, yPercent: 34, rotation: 5, scale: 0.4 },
  { xPercent: 56, yPercent: 30, rotation: -6, scale: 0.42 },
  { xPercent: 2, yPercent: -46, rotation: 4, scale: 0.36 },
]

/** Posição de pouso da foto secundária de índice `index` (1 = primeira
 * secundária) na colagem — cicla pelos slots se houver mais fotos que
 * slots (não deveria acontecer com MAX_PHOTOS atual). */
export function collageSlotFor(index: number): CollageSlot {
  return COLLAGE_SLOTS[(index - 1) % COLLAGE_SLOTS.length]
}
