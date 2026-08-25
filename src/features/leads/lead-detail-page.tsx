import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldLabel } from '@/components/field-label'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/phone-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useBrokers } from '@/features/brokers/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { capitalizeName } from '@/lib/capitalize'
import { errorMessage } from '@/lib/errors'
import { useDeleteLead, useLead, useLeadFollowUps, useUpdateLead, type LeadSource, type LeadStatus } from './api'
import { FollowUpTable } from './follow-up-table'
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_VARIANT } from './labels'
import { ScheduleFollowUpDialog } from './schedule-follow-up-dialog'

const NONE = '__none__'
const SOURCES = Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]
const STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]

const schema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  phone: z.string(),
  email: z.union([z.literal(''), z.email('E-mail inválido.')]),
  source: z.enum(SOURCES as [LeadSource, ...LeadSource[]]),
  broker_id: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const { data: lead, isLoading, isError } = useLead(id)
  const { data: followUps } = useLeadFollowUps(id)
  const { data: brokers } = useBrokers(tenant.id)
  const updateLead = useUpdateLead(tenant.id)
  const deleteLead = useDeleteLead(tenant.id)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', source: 'manual', broker_id: NONE, notes: '' },
  })

  useEffect(() => {
    if (!lead) return
    reset({
      name: lead.name,
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      source: lead.source,
      broker_id: lead.broker_id ?? NONE,
      notes: lead.notes ?? '',
    })
  }, [lead, reset])

  if (isLoading) return <FullscreenSpinner />
  if (isError || !lead) {
    return (
      <FullscreenMessage
        title="Lead não encontrado"
        description="Ele pode ter sido excluído ou você não tem acesso a ele."
      />
    )
  }

  async function onSubmit(values: FormValues) {
    try {
      await updateLead.mutateAsync({
        id: lead!.id,
        ...values,
        broker_id: values.broker_id === NONE ? '' : values.broker_id,
        announcement_id: lead!.announcement_id ?? '',
      })
      toast.success('Lead atualizado.')
    } catch (error) {
      toast.error('Não foi possível salvar', { description: errorMessage(error) })
    }
  }

  async function handleStatusChange(status: LeadStatus) {
    try {
      await updateLead.mutateAsync({
        id: lead!.id,
        status,
        ...watch(),
        broker_id: watch('broker_id') === NONE ? '' : watch('broker_id'),
        announcement_id: lead!.announcement_id ?? '',
      })
      toast.success(`Status alterado para ${LEAD_STATUS_LABELS[status]}.`)
    } catch (error) {
      toast.error('Não foi possível alterar o status', { description: errorMessage(error) })
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir o lead "${lead!.name}"? Essa ação não pode ser desfeita.`)) return
    try {
      await deleteLead.mutateAsync(lead!.id)
      toast.success('Lead excluído.')
      navigate('/leads')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: errorMessage(error) })
    }
  }

  const nameField = register('name')

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/leads" className="text-muted-foreground hover:text-foreground w-fit text-sm">
        ← Voltar
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
          <Badge variant={LEAD_STATUS_VARIANT[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={handleDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="lead-detail-name">Nome</FieldLabel>
              <Input
                id="lead-detail-name"
                {...nameField}
                onBlur={(e) => {
                  nameField.onBlur(e)
                  setValue('name', capitalizeName(e.target.value))
                }}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="lead-detail-phone">Telefone</FieldLabel>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneInput id="lead-detail-phone" value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="lead-detail-email">E-mail</FieldLabel>
                <Input
                  id="lead-detail-email"
                  type="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Origem</FieldLabel>
                <Select value={watch('source')} onValueChange={(v) => setValue('source', v as LeadSource)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {LEAD_SOURCE_LABELS[source]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel hint="Deixe em branco pra entrar na fila de leads não atribuídos.">Corretor</FieldLabel>
                <Select value={watch('broker_id')} onValueChange={(v) => setValue('broker_id', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não atribuído</SelectItem>
                    {brokers?.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id}>
                        {broker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="lead-detail-notes">Observações</FieldLabel>
              <Textarea id="lead-detail-notes" rows={3} {...register('notes')} />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateLead.isPending}>
                {updateLead.isPending && <Loader2 className="animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-ups</CardTitle>
          <CardAction>
            <Button size="sm" onClick={() => setScheduleOpen(true)}>
              <Plus className="size-4" /> Agendar
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {followUps ? <FollowUpTable followUps={followUps} /> : <Skeleton className="h-24 w-full" />}
        </CardContent>
      </Card>

      <ScheduleFollowUpDialog open={scheduleOpen} onOpenChange={setScheduleOpen} lead={lead} />
    </div>
  )
}
