import { forwardRef } from 'react'

/** Só a estrutura do título da categoria — sem lógica de animação própria.
 * O encolhimento (tamanho grande/centralizado → pequeno/canto superior
 * esquerdo) é feito de fora, pelo GSAP timeline de PropertyTypeSection,
 * animando este mesmo nó via ref. Nunca é o alvo do pin em si (isso é o
 * wrapper de PropertyTypeSection) — só o alvo do tween de encolhimento. */
export const CategoryTitle = forwardRef<HTMLDivElement, { label: string; count: number }>(
  function CategoryTitle({ label, count }, ref) {
    return (
      <div ref={ref} className="pointer-events-none absolute top-10 left-6 sm:top-12 sm:left-10">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Categoria
        </p>
        <h2 className="text-foreground text-4xl font-semibold sm:text-5xl">{label}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {count} {count === 1 ? 'imóvel disponível' : 'imóveis disponíveis'}
        </p>
      </div>
    )
  },
)
