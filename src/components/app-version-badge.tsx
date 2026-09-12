import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Selo informativo da versão do programa, compartilhado por todos os apps. */
export function AppVersionBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium tabular-nums">
            v{__APP_VERSION__}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>Versão do programa</TooltipContent>
    </Tooltip>
  )
}
