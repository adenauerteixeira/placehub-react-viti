import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useSales } from '@/features/sales/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useCommissions } from './api'
import { COMMISSION_STATUS_LABELS, COMMISSION_STATUS_VARIANT } from './labels'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function CommissionsListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: commissions, isLoading, isError } = useCommissions(tenant.id)
  const { data: sales } = useSales(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)

  const announcementTitle = (saleId: string) => {
    const sale = sales?.find((s) => s.id === saleId)
    return announcements?.find((a) => a.id === sale?.announcement_id)?.title ?? '—'
  }
  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comissões</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && <p className="text-destructive text-sm">Não foi possível carregar as comissões.</p>}
        {commissions && commissions.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma comissão ainda — elas são geradas automaticamente ao fechar uma venda.
          </p>
        )}
        {commissions && commissions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anúncio</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Valor bruto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell className="font-medium">{announcementTitle(commission.sale_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{brokerName(commission.broker_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatPrice(commission.gross_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={COMMISSION_STATUS_VARIANT[commission.status]}>
                      {COMMISSION_STATUS_LABELS[commission.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(commission.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ver detalhes"
                      onClick={() => navigate(`/commissions/${commission.id}`)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
