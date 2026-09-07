// Convenção extract(dow) do Postgres: 0=domingo .. 6=sábado — mesma ordem
// usada em tenant_backup_schedules.day_of_week.
export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
}

export function formatTimeOfDay(value: string): string {
  return value.slice(0, 5)
}
