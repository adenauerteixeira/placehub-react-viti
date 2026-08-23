import { CircleHelp } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Label padrão de campo de formulário, com um ícone de ajuda opcional
 * (tooltip) explicando o que o campo significa — padrão do sistema pra
 * qualquer formulário, não só um caso isolado. Use no lugar de <Label>
 * puro sempre que o campo se beneficiar de uma explicação rápida. */
export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground -m-0.5 p-0.5"
              aria-label="Ajuda sobre este campo"
            >
              <CircleHelp className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
