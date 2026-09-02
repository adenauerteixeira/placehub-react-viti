import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Botão de criação padrão do sistema: só o ícone "+", com o rótulo
 * completo aparecendo como tooltip no hover/foco (em vez de texto sempre
 * visível, ou só escondido em telas pequenas via `hidden sm:inline`) —
 * padroniza os vários "+ Novo X" espalhados pelas listagens. Aceita
 * `asChild` pra casos como `<CreateButton asChild><Link>...</Link></CreateButton>`. */
export function CreateButton({
  label,
  size = 'icon',
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size={size} aria-label={label} {...props}>
          {children ?? <Plus />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
