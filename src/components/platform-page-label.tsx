/** Rótulo "| PLATAFORMA – <página>" mostrado perto do ThemeToggle nas telas
 * da plataforma (console e login), pra deixar claro em qual contexto/página
 * a pessoa está. */
export function PlatformPageLabel({ page }: { page: string }) {
  return (
    <span className="text-muted-foreground text-sm whitespace-nowrap uppercase">
      |<span className="ml-2">Plataforma – {page}</span>
    </span>
  )
}
