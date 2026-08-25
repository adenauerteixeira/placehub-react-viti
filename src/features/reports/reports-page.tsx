import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBrokers } from '@/features/brokers/api'
import { COMMISSION_STATUS_LABELS, COMMISSION_STATUS_VARIANT } from '@/features/commissions/labels'
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, LEAD_STATUS_VARIANT } from '@/features/leads/labels'
import { INSTALLMENT_STATUS_LABELS, SALE_STATUS_LABELS, SALE_STATUS_VARIANT } from '@/features/sales/labels'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useReportData, type ReportFilters, type ReportType } from './api'

const ALL = '__all__'

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  sales: 'Vendas',
  commissions: 'Comissões',
  receipts: 'Recebimentos',
  brokers: 'Corretores',
  leads: 'Leads',
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR')
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function defaultRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const toInput = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: toInput(start), endDate: toInput(end) }
}

export function ReportsPage() {
  const { tenant, profile } = useTenantOutletContext()
  const isBroker = profile.role === 'broker'
  const { data: brokers } = useBrokers(isBroker ? null : tenant.id)

  const [type, setType] = useState<ReportType>('sales')
  const [{ startDate, endDate }, setRange] = useState(defaultRange)
  const [brokerId, setBrokerId] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  const filters: ReportFilters = useMemo(
    () => ({
      type,
      startDate,
      endDate,
      brokerId: brokerId === ALL ? null : brokerId,
      status: status === ALL ? null : status,
    }),
    [type, startDate, endDate, brokerId, status],
  )

  const { data: result, isLoading, isError } = useReportData(tenant.id, filters)

  function handleTypeChange(value: ReportType) {
    setType(value)
    setStatus(ALL)
  }

  const statusOptions =
    type === 'sales'
      ? SALE_STATUS_LABELS
      : type === 'commissions'
        ? COMMISSION_STATUS_LABELS
        : type === 'receipts'
          ? INSTALLMENT_STATUS_LABELS
          : type === 'leads'
            ? LEAD_STATUS_LABELS
            : null

  return (
    <div className="flex flex-col gap-6">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Relatórios</CardTitle>
          <CardAction>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Imprimir
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => handleTypeChange(v as ReportType)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {REPORT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Início</Label>
              <Input
                type="date"
                className="w-40"
                value={startDate}
                onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fim</Label>
              <Input
                type="date"
                className="w-40"
                value={endDate}
                onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
              />
            </div>
            {!isBroker && (
              <div className="flex flex-col gap-1.5">
                <Label>Corretor</Label>
                <Select value={brokerId} onValueChange={setBrokerId}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os corretores</SelectItem>
                    {brokers?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {statusOptions && (
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos os status</SelectItem>
                    {Object.entries(statusOptions).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="hidden flex-col gap-1 print:flex">
        <h1 className="text-xl font-semibold">
          Relatório de {REPORT_TYPE_LABELS[type]} — {tenant.name}
        </h1>
        <p className="text-muted-foreground text-sm">
          {formatDate(startDate)} a {formatDate(endDate)}
        </p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {isError && <p className="text-destructive text-sm">Não foi possível carregar o relatório.</p>}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {result.summary.map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-6">
                  <p className="text-xl font-semibold">
                    {item.format === 'money' ? formatPrice(item.value) : item.value}
                  </p>
                  <p className="text-muted-foreground text-sm">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="overflow-x-auto pt-6">
              {result.type === 'sales' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente / imóvel</TableHead>
                      <TableHead>Corretor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground text-center">
                          Nenhuma venda encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                    {result.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.sold_at)}</TableCell>
                        <TableCell>
                          <Link to={`/sales/${row.id}`} className="font-medium hover:underline print:no-underline">
                            {row.clientName}
                          </Link>
                          <div className="text-muted-foreground text-xs">{row.announcementTitle}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.brokerName}</TableCell>
                        <TableCell>
                          <Badge variant={SALE_STATUS_VARIANT[row.status]}>{SALE_STATUS_LABELS[row.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatPrice(row.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {result.type === 'commissions' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Corretor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Bruta</TableHead>
                      <TableHead className="text-right">Corretor</TableHead>
                      <TableHead className="text-right">Imobiliária</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground text-center">
                          Nenhuma comissão encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                    {result.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.sold_at)}</TableCell>
                        <TableCell>
                          <Link
                            to={`/commissions/${row.id}`}
                            className="font-medium hover:underline print:no-underline"
                          >
                            {row.clientName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.brokerName}</TableCell>
                        <TableCell>
                          <Badge variant={COMMISSION_STATUS_VARIANT[row.status]}>
                            {COMMISSION_STATUS_LABELS[row.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatPrice(row.gross_amount)}</TableCell>
                        <TableCell className="text-right">{formatPrice(row.broker_amount)}</TableCell>
                        <TableCell className="text-right">{formatPrice(row.agency_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {result.type === 'receipts' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Corretor</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recebido em</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground text-center">
                          Nenhum recebimento encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {result.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.due_date)}</TableCell>
                        <TableCell>
                          <Link
                            to={`/sales/${row.saleId}`}
                            className="font-medium hover:underline print:no-underline"
                          >
                            {row.clientName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.brokerName}</TableCell>
                        <TableCell>{row.number}</TableCell>
                        <TableCell>{INSTALLMENT_STATUS_LABELS[row.status]}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(row.received_at)}</TableCell>
                        <TableCell className="text-right">{formatPrice(row.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {result.type === 'brokers' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Corretor</TableHead>
                      <TableHead>CRECI</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Convertidos</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Valor vendido</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground text-center">
                          Nenhum corretor encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {result.rows.map((row) => (
                      <TableRow key={row.broker_id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-muted-foreground">{row.creci}</TableCell>
                        <TableCell className="text-right">{row.leadsCount}</TableCell>
                        <TableCell className="text-right">{row.convertedLeads}</TableCell>
                        <TableCell className="text-right">{row.salesCount}</TableCell>
                        <TableCell className="text-right">{formatPrice(row.salesAmount)}</TableCell>
                        <TableCell className="text-right">{formatPrice(row.commissionAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {result.type === 'leads' && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Corretor</TableHead>
                      <TableHead>Anúncio</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground text-center">
                          Nenhum lead encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {result.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDateTime(row.created_at)}</TableCell>
                        <TableCell>
                          <Link to={`/leads/${row.id}`} className="font-medium hover:underline print:no-underline">
                            {row.name}
                          </Link>
                          <div className="text-muted-foreground text-xs">{row.phone || row.email || '—'}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{LEAD_SOURCE_LABELS[row.source]}</TableCell>
                        <TableCell className="text-muted-foreground">{row.brokerName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.announcementTitle}</TableCell>
                        <TableCell>
                          <Badge variant={LEAD_STATUS_VARIANT[row.status]}>{LEAD_STATUS_LABELS[row.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
