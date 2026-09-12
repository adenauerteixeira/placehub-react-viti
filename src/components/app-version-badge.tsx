import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** Selo informativo da versão do programa, compartilhado por todos os apps. */
export function AppVersionBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            'inline-flex size-3.5 cursor-default items-center justify-center rounded-full border border-background bg-primary text-[8px] leading-none font-bold text-primary-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className,
          )}
        >
          v
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>Versão v{__APP_VERSION__}</TooltipContent>
    </Tooltip>
  )
}
