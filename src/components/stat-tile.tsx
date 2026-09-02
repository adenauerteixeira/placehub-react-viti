import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type StatTileAccent = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5'

const ACCENT_CLASSES: Record<StatTileAccent, string> = {
  'chart-1': 'bg-chart-1/10 text-chart-1',
  'chart-2': 'bg-chart-2/10 text-chart-2',
  'chart-3': 'bg-chart-3/10 text-chart-3',
  'chart-4': 'bg-chart-4/10 text-chart-4',
  'chart-5': 'bg-chart-5/10 text-chart-5',
}

function formatValue(value: string | number, format?: 'count' | 'money') {
  if (typeof value === 'string') return value
  if (format === 'money') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return value.toLocaleString('pt-BR')
}

export function StatTile({
  label,
  value,
  format,
  icon: Icon,
  accent = 'chart-1',
  hint,
  to,
  size = 'default',
  className,
}: {
  label: string
  value: string | number
  format?: 'count' | 'money'
  icon?: LucideIcon
  accent?: StatTileAccent
  hint?: string
  to?: string
  size?: 'default' | 'sm'
  className?: string
}) {
  const content = (
    <Card
      className={cn(
        'shadow-sm ring-border/60 transition-shadow',
        to && 'hover:shadow-md',
        className
      )}
      size={size === 'sm' ? 'sm' : 'default'}
    >
      <CardContent className={cn('flex items-center gap-3', size === 'sm' && 'gap-2.5')}>
        {Icon && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg',
              size === 'sm' ? 'size-8' : 'size-10',
              ACCENT_CLASSES[accent]
            )}
          >
            <Icon className={size === 'sm' ? 'size-4' : 'size-5'} />
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <p className={cn('font-semibold', size === 'sm' ? 'text-lg' : 'text-xl')}>
            {formatValue(value, format)}
          </p>
          <p className="text-muted-foreground truncate text-sm">{label}</p>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )

  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}
