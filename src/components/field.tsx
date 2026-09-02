import { FieldLabel } from '@/components/field-label'
import { cn } from '@/lib/utils'

/** Wrapper padrão de campo de formulário: label (+ tooltip de ajuda opcional)
 * associado ao controle via `htmlFor`/`id`, e mensagem de erro sempre no
 * mesmo lugar — substitui o bloco `<div><FieldLabel/><Input/>{error && <p/>}</div>`
 * repetido em todo formulário do sistema. Não assume nenhum formato de
 * controle (Input/Select/Controller) — só organiza label/controle/erro. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={htmlFor} hint={hint}>
        {label}
      </FieldLabel>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
