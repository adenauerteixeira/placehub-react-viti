import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/monitoring'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/** Última barreira para falhas síncronas de renderização. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Falha não tratada ao renderizar a aplicação.', error, info)
    captureException(error, { componentStack: info.componentStack })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-6">
        <section className="flex max-w-md flex-col items-center gap-4 text-center">
          <AlertTriangle className="text-destructive size-10" aria-hidden="true" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Não foi possível exibir esta página</h1>
            <p className="text-muted-foreground text-sm">
              Ocorreu um erro inesperado. Atualize a página para tentar novamente.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar página
          </Button>
        </section>
      </main>
    )
  }
}
