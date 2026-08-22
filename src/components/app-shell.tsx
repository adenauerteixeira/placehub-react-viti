import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Shell comum a todas as telas: cabeçalho e rodapé "fixos" (nunca saem de
// vista — via flex-shrink, não position:fixed, pra não precisar de
// compensação manual de altura) com fundo translúcido/desfocado, conteúdo
// centralizado até max-w-7xl, e só a área central rola quando o conteúdo
// não cabe. Baseado no app.blade.php/guest.blade.php do sistema anterior.
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
    <div className="flex h-dvh flex-col overflow-hidden" style={style}>
      <header className="bg-background/80 shrink-0 border-b backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
          {header}
        </div>
      </header>
      <main
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          centerMain && 'flex items-center justify-center',
        )}
      >
        <div className={cn('mx-auto w-full max-w-7xl px-6 py-6', centerMain && 'py-0')}>
          {children}
        </div>
      </main>
      {footer ?? <AppFooter />}
    </div>
  )
}

export function AppFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="bg-background/80 text-muted-foreground shrink-0 border-t px-4 py-3 text-center text-xs backdrop-blur-md">
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
