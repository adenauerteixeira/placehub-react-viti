import { useState, type CSSProperties, type ReactNode } from 'react'
import { ThemeScopeProvider } from '@/lib/theme-scope'
import { cn } from '@/lib/utils'

// Shell comum a todas as telas: cabeçalho e rodapé de verdade "fixos"
// (position: fixed, sobrepostos ao conteúdo, como no guest.blade.php do
// sistema anterior) com fundo translúcido/desfocado — a translucidez só
// fica visível porque o conteúdo passa por baixo deles ao rolar. Altura
// fixa (h-16/h-11) pra sobrar espaço exato pro <main>, que ocupa o resto
// da tela e rola sozinho quando o conteúdo não cabe. As classes de altura
// (h-16/top-16, h-11/bottom-11) ficam escritas por extenso — o Tailwind só
// gera CSS pra classes que aparecem como texto literal no código.

export function AppShell({
  header,
  children,
  centerMain = false,
  footer,
  style,
}: {
  header: ReactNode
  children: ReactNode
  centerMain?: boolean
  footer?: ReactNode
  style?: CSSProperties
}) {
  // Callback ref (em vez de useRef) porque precisa disparar um re-render
  // quando o nó monta — é isso que faz o ThemeScopeProvider propagar o
  // elemento de verdade pros portais do Radix (Dialog/Select/etc.), que
  // teriam renderizado com container=null se dependessem de uma ref comum.
  const [scopeEl, setScopeEl] = useState<HTMLDivElement | null>(null)

  return (
    <ThemeScopeProvider value={scopeEl}>
      <div ref={setScopeEl} className="relative h-dvh overflow-hidden" style={style}>
        <header className="bg-background/82 fixed inset-x-0 top-0 z-30 h-16 border-b border-border/75 shadow-[0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl">
          <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            {header}
          </div>
        </header>
        <main
          className={cn(
            // overflow-x explícito de propósito: só declarar overflow-y
            // deixa o eixo x com o valor efetivo "auto" (regra do CSS pra
            // quando só um eixo tem overflow != visible) — qualquer
            // elemento que vaze um pouco na horizontal (ex: o carrossel de
            // banner em largura total, que usa margem negativa) faria
            // aparecer uma barra de rolagem horizontal aqui.
            'absolute inset-x-0 top-16 bottom-11 overflow-x-hidden overflow-y-auto',
            centerMain && 'flex items-center justify-center',
          )}
        >
          <div className={cn('mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 sm:py-8')}>{children}</div>
        </main>
        {footer ?? <AppFooter />}
      </div>
    </ThemeScopeProvider>
  )
}

export function AppFooter({ children, showVersion = true }: { children?: ReactNode; showVersion?: boolean }) {
  return (
    <footer className="bg-background/82 text-muted-foreground fixed inset-x-0 bottom-0 z-30 flex h-11 items-center justify-center border-t border-border/75 px-4 text-center text-xs backdrop-blur-2xl">
      {children ?? <>© {new Date().getFullYear()} PlaceHub — Conectando imóveis, corretores e oportunidades.</>}
      {showVersion && (
        <span className="ml-2 shrink-0 text-[10px] opacity-65" title="Versão da publicação">
          #{__APP_VERSION__}
        </span>
      )}
    </footer>
  )
}

/** Selo do logo com a cor de fundo (ou transparente) configurada pelo tenant. */
export function LogoBadge({
  src,
  alt,
  background,
}: {
  src: string
  alt: string
  background: string
}) {
  return (
    <span className="inline-flex items-center rounded-lg p-1.5" style={{ background }}>
      <img src={src} alt={alt} className="h-8 max-w-40 object-contain" />
    </span>
  )
}
