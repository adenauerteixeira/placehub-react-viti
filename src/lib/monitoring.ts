const dsn = import.meta.env.VITE_GLITCHTIP_DSN
type MonitoringSdk = typeof import('@sentry/react')

let sdk: MonitoringSdk | undefined

/**
 * Inicializa o monitoramento somente quando uma DSN for configurada.
 * Por padrão, a aplicação não envia telemetria a nenhum serviço externo.
 */
export async function initMonitoring() {
  if (!dsn) return

  sdk = await import('@sentry/react')
  sdk.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!sdk) return

  sdk.captureException(error, { extra: context })
}
