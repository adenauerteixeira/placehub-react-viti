import { forwardRef } from 'react'

/** Só a estrutura do título da categoria — sem lógica de animação própria.
 * O encolhimento (tamanho grande/centralizado → pequeno/canto superior
 * esquerdo) é feito de fora, pelo GSAP timeline de PropertyTypeSection,
 * animando este mesmo nó via ref. Nunca é o alvo do pin em si (isso é o
 * wrapper de PropertyTypeSection) — só o alvo do tween de encolhimento. */
export const CategoryTitle = forwardRef<
  HTMLDivElement,
  { label: string; count: number; onParticles?: boolean }
>(function CategoryTitle({ label, count, onParticles }, ref) {
  // O canvas de partículas é sempre escuro (sua própria imagem de fundo,
  // fixa por trás da página inteira), independente do tema claro/escuro do
  // tenant — usar as cores de tema aqui (pensadas pro fundo sólido normal)
  // deixaria o título praticamente ilegível no tema claro. Com partículas,
  // força branco.
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute top-5 left-6 sm:top-6 sm:left-10"
      style={{ textShadow: '0 2px 16px rgba(0, 0, 0, 0.45)' }}
    >
      <p
        className={
          onParticles
            ? 'text-xs font-medium tracking-wide text-white/70 uppercase'
            : 'text-muted-foreground text-xs font-medium tracking-wide uppercase'
        }
      >
        Categoria
      </p>
      <h2
        className={
          onParticles
            ? 'text-4xl font-semibold text-white sm:text-5xl'
            : 'text-foreground text-4xl font-semibold sm:text-5xl'
        }
      >
        {label}
      </h2>
      <p className={onParticles ? 'mt-1 text-sm text-white/70' : 'text-muted-foreground mt-1 text-sm'}>
        {count} {count === 1 ? 'imóvel disponível' : 'imóveis disponíveis'}
      </p>
    </div>
  )
})
