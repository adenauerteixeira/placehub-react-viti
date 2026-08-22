import { Loader2 } from 'lucide-react'

export function FullscreenSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  )
}

export function FullscreenMessage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
    </div>
  )
}
