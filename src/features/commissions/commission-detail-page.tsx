import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, ThumbsUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { receiptSignedUrl, useSale } from '@/features/sales/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { errorMessage } from '@/lib/errors'
import { useCommission, useCommissionInstallments, useConfirmBrokerReceipt, type CommissionInstallment } from './api'
import { COMMISSION_INSTALLMENT_STATUS_LABELS, COMMISSION_STATUS_LABELS, COMMISSION_STATUS_VARIANT } from './labels'
import { RegisterBrokerPaymentDialog } from './register-broker-payment-dialog'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant, profile } = useTenantOutletContext()
  const [registering, setRegistering] = useState<CommissionInstallment | null>(null)

  const { data: commission, isLoading, isError } = useCommission(id)
  const { data: installments } = useCommissionInstallments(id)
  const { data: sale } = useSale(commission?.sale_id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const confirmReceipt = useConfirmBrokerReceipt(id ?? '', tenant.id)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !commission) {
    return (
      <FullscreenMessage
        title="Comissão não encontrada"
        description="Ela pode não existir ou você não tem acesso a ela."
      />
    )
  }

  const announcementTitle = announcements?.find((a) => a.id === sale?.announcement_id)?.title ?? '—'
  const broker = brokers?.find((b) => b.id === commission.broker_id)
  const myBroker = brokers?.find((b) => b.profile_id === profile.id)
  const isMyCommission = myBroker && commission.broker_id === myBroker.id

  async function handleOpenReceipt(path: string) {
    const url = await receiptSignedUrl(path)
    if (url) window.open(url, '_blank')
  }

  async function handleConfirm(installmentId: string) {
    try {
      await confirmReceipt.mutateAsync(installmentId)
      toast.success('Recebimento confirmado.')
    } catch (error) {
      toast.error('Não foi possível confirmar', { description: errorMessage(error) })
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/commissions" className="text-muted-foreground hover:text-foreground w-fit text-sm">
        ← Voltar
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{announcementTitle}</h1>
        <Badge variant={COMMISSION_STATUS_VARIANT[commission.status]}>
          {COMMISSION_STATUS_LABELS[commission.status]}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da comissão</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Corretor</p>
            <p>{broker?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Percentual total</p>
            <p>{commission.percentage}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Valor bruto</p>
            <p>{formatPrice(commission.gross_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Corretor ({commission.broker_percentage}%)</p>
            <p>{formatPrice(commission.broker_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Imobiliária ({commission.agency_percentage}%)</p>
            <p>{formatPrice(commission.agency_amount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          {!installments || installments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem parcelas — a venda foi paga à vista, sem parcelamento de entrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Valor do corretor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>{installment.number}</TableCell>
                    <TableCell>{formatPrice(installment.broker_amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(installment.due_date)}</TableCell>
                    <TableCell>
                      <Badge variant={installment.status === 'paid' ? 'default' : 'outline'}>
                        {COMMISSION_INSTALLMENT_STATUS_LABELS[installment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {installment.broker_receipt_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Ver comprovante"
                            onClick={() => handleOpenReceipt(installment.broker_receipt_path!)}
                          >
                            <FileText className="size-4" />
                          </Button>
                        )}
                        {profile.role === 'tenant_admin' &&
                          installment.status === 'received' &&
                          !installment.broker_confirmed_at && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Registrar repasse"
                              onClick={() => setRegistering(installment)}
                            >
                              <Wallet className="size-4" />
                            </Button>
                          )}
                        {isMyCommission && installment.status === 'awaiting_confirmation' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Confirmar recebimento"
                            onClick={() => handleConfirm(installment.id)}
                          >
                            <ThumbsUp className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {registering && (
        <RegisterBrokerPaymentDialog
          open={!!registering}
          onOpenChange={(open) => !open && setRegistering(null)}
          installment={registering}
          tenantId={tenant.id}
        />
      )}
    </div>
  )
}
