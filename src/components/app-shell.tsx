import type { CSSProperties, ReactNode } from 'react'
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
  return (
    <div className="relative h-dvh overflow-hidden" style={style}>
      <header className="bg-background/70 fixed inset-x-0 top-0 z-30 h-16 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-6">
          {header}
        </div>
      </header>
      <main
        className={cn(
          'absolute inset-x-0 top-16 bottom-11 overflow-y-auto',
          centerMain && 'flex items-center justify-center',
        )}
      >
        <div className={cn('mx-auto w-full max-w-7xl px-6 py-8')}>{children}</div>
      </main>
      {footer ?? <AppFooter />}
    </div>
  )
}

export function AppFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="bg-background/70 text-muted-foreground fixed inset-x-0 bottom-0 z-30 flex h-11 items-center justify-center border-t px-4 text-center text-xs backdrop-blur-xl">
      {children ?? (
        <>© {new Date().getFullYear()} PlaceHub — Conectando imóveis, corretores e oportunidades.</>
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
