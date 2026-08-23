import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { slugWithRandomSuffix } from '@/lib/slugify'
import {
  useCreateDevelopment,
  useUpdateDevelopment,
  type Development,
  type DevelopmentStatus,
  type DevelopmentType,
} from './api'
import { DEVELOPMENT_STATUS_LABELS, DEVELOPMENT_TYPE_LABELS } from './labels'

const TYPES = Object.keys(DEVELOPMENT_TYPE_LABELS) as DevelopmentType[]
const STATUSES = Object.keys(DEVELOPMENT_STATUS_LABELS) as DevelopmentStatus[]

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  type: z.enum(TYPES as [DevelopmentType, ...DevelopmentType[]]),
  developer: z.string(),
  status: z.enum(STATUSES as [DevelopmentStatus, ...DevelopmentStatus[]]),
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = { name: '', type: 'subdivision', developer: '', status: 'draft' }

export function DevelopmentFormDialog({
  open,
  onOpenChange,
  tenantId,
  development,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  development?: Development
}) {
  const isEdit = !!development
  const createDevelopment = useCreateDevelopment(tenantId)
  const updateDevelopment = useUpdateDevelopment(tenantId)
  const submitting = createDevelopment.isPending || updateDevelopment.isPending

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
      development
        ? {
            name: development.name,
            type: development.type,
            developer: development.developer ?? '',
            status: development.status,
          }
        : emptyValues,
    )
  }, [open, development, reset])

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateDevelopment.mutateAsync({ id: development.id, ...values })
        toast.success('Empreendimento atualizado.')
      } else {
        await createDevelopment.mutateAsync({ ...values, slug: slugWithRandomSuffix(values.name) })
        toast.success('Empreendimento criado.')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(isEdit ? 'Não foi possível salvar' : 'Não foi possível criar', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar empreendimento' : 'Novo empreendimento'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Altere os dados do empreendimento.'
              : 'Cadastre um loteamento, condomínio ou lançamento.'}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dev-name">Nome</Label>
            <Input id="dev-name" {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={watch('type')} onValueChange={(v) => setValue('type', v as DevelopmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DEVELOPMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as DevelopmentStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {DEVELOPMENT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dev-developer">Incorporadora</Label>
            <Input id="dev-developer" {...register('developer')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? 'Salvar' : 'Criar empreendimento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
