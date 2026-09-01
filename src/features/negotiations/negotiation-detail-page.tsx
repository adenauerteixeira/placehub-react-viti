import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/field'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useLead } from '@/features/leads/api'
import { ProposalList } from '@/features/proposals/proposal-list'
import { useActiveReservationForAnnouncement } from '@/features/reservations/api'
import { ReserveDialog } from '@/features/reservations/reserve-dialog'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage } from '@/lib/errors'
import { useNegotiation, useUpdateNegotiation, type NegotiationStatus } from './api'
import { NEGOTIATION_STATUS_LABELS, NEGOTIATION_STATUS_VARIANT } from './labels'

const NONE = '__none__'
const STATUSES = Object.keys(NEGOTIATION_STATUS_LABELS) as NegotiationStatus[]

function toLocalInput(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const schema = z.object({
  announcement_id: z.string(),
  broker_id: z.string(),
  next_contact_at: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

export function NegotiationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant } = useTenantOutletContext()
  const [reserving, setReserving] = useState(false)
  const { confirmWithReason } = useConfirm()

  const { data: negotiation, isLoading, isError } = useNegotiation(id)
  const { data: lead } = useLead(negotiation?.lead_id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const { data: activeReservation } = useActiveReservationForAnnouncement(negotiation?.announcement_id)
  const updateNegotiation = useUpdateNegotiation(tenant.id)

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { announcement_id: NONE, broker_id: NONE, next_contact_at: '', notes: '' },
  })

  useEffect(() => {
    if (!negotiation) return
    reset({
      announcement_id: negotiation.announcement_id ?? NONE,
      broker_id: negotiation.broker_id ?? NONE,
      next_contact_at: toLocalInput(negotiation.next_contact_at),
      notes: negotiation.notes ?? '',
    })
  }, [negotiation, reset])

  if (isLoading) return <FullscreenSpinner />
  if (isError || !negotiation) {
    return (
      <FullscreenMessage
        title="Negociação não encontrada"
        description="Ela pode ter sido excluída ou você não tem acesso a ela."
      />
    )
  }

  async function onSubmit(values: FormValues) {
    try {
      await updateNegotiation.mutateAsync({
        id: negotiation!.id,
        ...values,
        lead_id: negotiation!.lead_id,
        announcement_id: values.announcement_id === NONE ? '' : values.announcement_id,
        broker_id: values.broker_id === NONE ? '' : values.broker_id,
      })
      toast.success('Negociação atualizada.')
    } catch (error) {
      toast.error('Não foi possível salvar', { description: errorMessage(error) })
    }
  }

  async function handleStatusChange(status: NegotiationStatus) {
    let lost_reason: string | undefined
    if (status === 'lost') {
      const reason = await confirmWithReason({
        title: 'Marcar negociação como perdida',
        reasonLabel: 'Motivo (opcional)',
        reasonPlaceholder: 'Por que essa negociação foi perdida?',
        confirmLabel: 'Marcar como perdida',
      })
      if (reason === null) return
      lost_reason = reason
    }
    try {
      await updateNegotiation.mutateAsync({
        id: negotiation!.id,
        status,
        lost_reason,
        lead_id: negotiation!.lead_id,
        announcement_id: watch('announcement_id') === NONE ? '' : watch('announcement_id'),
        broker_id: watch('broker_id') === NONE ? '' : watch('broker_id'),
        next_contact_at: watch('next_contact_at'),
        notes: watch('notes'),
      })
      toast.success(`Status alterado para ${NEGOTIATION_STATUS_LABELS[status]}.`)
    } catch (error) {
      toast.error('Não foi possível alterar o status', { description: errorMessage(error) })
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/negotiations" className="text-muted-foreground hover:text-foreground w-fit text-sm">
        ← Voltar
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {lead ? <Link to={`/leads/${lead.id}`} className="hover:underline">{lead.name}</Link> : '...'}
          </h1>
          <Badge variant={NEGOTIATION_STATUS_VARIANT[negotiation.status]}>
            {NEGOTIATION_STATUS_LABELS[negotiation.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {negotiation.announcement_id && !activeReservation && (
            <Button variant="outline" onClick={() => setReserving(true)}>
              <CalendarPlus className="size-4" /> Reservar imóvel
            </Button>
          )}
          <Select value={negotiation.status} onValueChange={(v) => handleStatusChange(v as NegotiationStatus)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {NEGOTIATION_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeReservation && (
        <p className="text-muted-foreground text-sm">
          Imóvel reservado até {new Date(activeReservation.expires_at).toLocaleString('pt-BR')}.
        </p>
      )}

      {negotiation.status === 'lost' && negotiation.lost_reason && (
        <p className="text-destructive text-sm">Motivo da perda: {negotiation.lost_reason}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da negociação</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Anúncio" htmlFor="negotiation-detail-announcement">
              <Select value={watch('announcement_id')} onValueChange={(v) => setValue('announcement_id', v)}>
                <SelectTrigger id="negotiation-detail-announcement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {announcements?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Corretor" htmlFor="negotiation-detail-broker">
                <Select value={watch('broker_id')} onValueChange={(v) => setValue('broker_id', v)}>
                  <SelectTrigger id="negotiation-detail-broker">
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
              </Field>
              <Field label="Próximo contato" htmlFor="negotiation-detail-next-contact">
                <Input
                  id="negotiation-detail-next-contact"
                  type="datetime-local"
                  {...register('next_contact_at')}
                />
              </Field>
            </div>

            <Field label="Observações" htmlFor="negotiation-detail-notes">
              <Textarea id="negotiation-detail-notes" rows={4} {...register('notes')} />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateNegotiation.isPending}>
                {updateNegotiation.isPending && <Loader2 className="animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ProposalList negotiationId={negotiation.id} reservationId={activeReservation?.id} />

      {negotiation.announcement_id && (
        <ReserveDialog
          open={reserving}
          onOpenChange={setReserving}
          announcementId={negotiation.announcement_id}
          leadId={negotiation.lead_id}
          brokerId={negotiation.broker_id ?? undefined}
        />
      )}
    </div>
  )
}
