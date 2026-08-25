import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Ban, FileText, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useCommissionBySale } from '@/features/commissions/api'
import { COMMISSION_STATUS_LABELS, COMMISSION_STATUS_VARIANT } from '@/features/commissions/labels'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { errorMessage } from '@/lib/errors'
import {
  receiptSignedUrl,
  useCancelSale,
  useSale,
  useSaleAuditLogs,
  useSaleInstallments,
  useSalePaymentAssets,
  type SaleEntryInstallment,
} from './api'
import { INSTALLMENT_STATUS_LABELS, SALE_STATUS_LABELS, SALE_STATUS_VARIANT } from './labels'
import { ReceiveInstallmentDialog } from './receive-installment-dialog'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { tenant, profile } = useTenantOutletContext()
  const [receiving, setReceiving] = useState<SaleEntryInstallment | null>(null)

  const { data: sale, isLoading, isError } = useSale(id)
  const { data: installments } = useSaleInstallments(id)
  const { data: assets } = useSalePaymentAssets(id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)
  const { data: commission } = useCommissionBySale(id)
  const { data: auditLogs } = useSaleAuditLogs(id)
  const cancelSale = useCancelSale(tenant.id)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !sale) {
    return (
      <FullscreenMessage
        title="Venda não encontrada"
        description="Ela pode ter sido excluída ou você não tem acesso a ela."
      />
    )
  }

  const announcementTitle = announcements?.find((a) => a.id === sale.announcement_id)?.title ?? '—'
  const brokerName = brokers?.find((b) => b.id === sale.broker_id)?.name ?? '—'

  async function handleOpenReceipt(path: string) {
    const url = await receiptSignedUrl(path)
    if (url) window.open(url, '_blank')
  }

  async function handleCancel() {
    const reason = window.prompt('Motivo do cancelamento:')
    if (reason === null) return
    try {
      await cancelSale.mutateAsync({ id: sale!.id, reason })
      toast.success('Venda cancelada.')
    } catch (error) {
      toast.error('Não foi possível cancelar', { description: errorMessage(error) })
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link to="/sales" className="text-muted-foreground hover:text-foreground w-fit text-sm">
        ← Voltar
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{announcementTitle}</h1>
          <Badge variant={SALE_STATUS_VARIANT[sale.status]}>{SALE_STATUS_LABELS[sale.status]}</Badge>
        </div>
        {sale.status === 'completed' && profile.role === 'tenant_admin' && (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleCancel}>
            <Ban className="size-4" /> Cancelar venda
          </Button>
        )}
      </div>

      {sale.status === 'cancelled' && sale.cancellation_reason && (
        <p className="text-destructive text-sm">Motivo do cancelamento: {sale.cancellation_reason}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da venda</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Corretor</p>
            <p>{brokerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Valor</p>
            <p>{formatPrice(sale.amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Entrada</p>
            <p>{formatPrice(sale.down_payment_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Financiamento</p>
            <p>{formatPrice(sale.financing_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Vendido em</p>
            <p>{formatDate(sale.sold_at)}</p>
          </div>
          {sale.financing_source && (
            <div>
              <p className="text-muted-foreground text-xs">Financiadora</p>
              <p>{sale.financing_source}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parcelas da entrada</CardTitle>
        </CardHeader>
        <CardContent>
          {!installments || installments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem parcelas de entrada — pago à vista.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>{installment.number}</TableCell>
                    <TableCell>{formatPrice(installment.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(installment.due_date)}</TableCell>
                    <TableCell>
                      <Badge variant={installment.status === 'received' ? 'default' : 'outline'}>
                        {INSTALLMENT_STATUS_LABELS[installment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {installment.receipt_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Ver comprovante"
                            onClick={() => handleOpenReceipt(installment.receipt_path!)}
                          >
                            <FileText className="size-4" />
                          </Button>
                        )}
                        {installment.status === 'pending' && sale.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Receber parcela"
                            onClick={() => setReceiving(installment)}
                          >
                            <Wallet className="size-4" />
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

      {assets && assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bens dados como parte de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.description}</TableCell>
                    <TableCell>{formatPrice(asset.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {commission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comissão</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={COMMISSION_STATUS_VARIANT[commission.status]}>
                {COMMISSION_STATUS_LABELS[commission.status]}
              </Badge>
              <span className="text-sm">{formatPrice(commission.gross_amount)}</span>
            </div>
            <Link to={`/commissions/${commission.id}`} className="text-primary text-sm hover:underline">
              Ver comissão →
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          {!auditLogs || auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma atividade registrada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {auditLogs.map((log) => (
                <li key={log.id} className="border-border border-l-2 pl-3 text-sm">
                  <p className="font-medium">{log.title}</p>
                  {log.description && <p className="text-muted-foreground">{log.description}</p>}
                  <p className="text-muted-foreground text-xs">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {receiving && (
        <ReceiveInstallmentDialog
          open={!!receiving}
          onOpenChange={(open) => !open && setReceiving(null)}
          installment={receiving}
          saleId={sale.id}
          tenantId={tenant.id}
        />
      )}
    </div>
  )
}
