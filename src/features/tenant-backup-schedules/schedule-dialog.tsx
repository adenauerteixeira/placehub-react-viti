import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateBackupSchedule, useUpdateBackupSchedule, type BackupSchedule } from './api'
import { DAY_OF_WEEK_LABELS } from './labels'

const schema = z.object({
  day_of_week: z.number().min(0).max(6),
  time_of_day: z.string().min(1, 'Informe um horário.'),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = { day_of_week: 1, time_of_day: '03:00' }

export function ScheduleDialog({
  open,
  onOpenChange,
  tenantId,
  schedule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  schedule?: BackupSchedule | null
}) {
  const isEditing = !!schedule
  const createSchedule = useCreateBackupSchedule(tenantId)
  const updateSchedule = useUpdateBackupSchedule(tenantId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues })

  useEffect(() => {
    if (!open) return
    reset(
      schedule
        ? { day_of_week: schedule.day_of_week, time_of_day: schedule.time_of_day.slice(0, 5) }
        : emptyValues,
    )
  }, [open, schedule, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (schedule) {
        await updateSchedule.mutateAsync({ id: schedule.id, ...values })
        toast.success('Agendamento atualizado.')
      } else {
        await createSchedule.mutateAsync(values)
        toast.success('Agendamento criado.')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(
        isEditing ? 'Não foi possível atualizar o agendamento' : 'Não foi possível criar o agendamento',
        { description: errorMessage(error) },
      )
    }
  }

  const pending = createSchedule.isPending || updateSchedule.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
          <DialogDescription>
            Toda semana, nesse dia e horário, o sistema gera um backup automaticamente e o guarda
            (os 10 mais recentes ficam disponíveis pra download logo abaixo).
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Dia da semana" htmlFor="schedule-day">
            <Select
              value={String(watch('day_of_week'))}
              onValueChange={(v) => setValue('day_of_week', Number(v))}
            >
              <SelectTrigger id="schedule-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Horário" htmlFor="schedule-time" error={errors.time_of_day?.message}>
            <Input id="schedule-time" type="time" {...register('time_of_day')} />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {isEditing ? 'Salvar alterações' : 'Criar agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
