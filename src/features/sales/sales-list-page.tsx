import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAnnouncements } from '@/features/announcements/api'
import { useBrokers } from '@/features/brokers/api'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useSales } from './api'
import { SALE_STATUS_LABELS, SALE_STATUS_VARIANT } from './labels'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function SalesListPage() {
  const navigate = useNavigate()
  const { tenant } = useTenantOutletContext()
  const { data: sales, isLoading, isError } = useSales(tenant.id)
  const { data: announcements } = useAnnouncements(tenant.id)
  const { data: brokers } = useBrokers(tenant.id)

  const announcementTitle = (id: string | null) => announcements?.find((a) => a.id === id)?.title ?? '—'
  const brokerName = (id: string | null) => brokers?.find((b) => b.id === id)?.name ?? '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && <p className="text-destructive text-sm">Não foi possível carregar as vendas.</p>}
        {sales && sales.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhuma venda ainda — feche uma venda a partir de uma proposta aceita, no hub da negociação.
          </p>
        )}
        {sales && sales.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anúncio</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vendido em</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{announcementTitle(sale.announcement_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{brokerName(sale.broker_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatPrice(sale.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={SALE_STATUS_VARIANT[sale.status]}>{SALE_STATUS_LABELS[sale.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(sale.sold_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ver detalhes"
                      onClick={() => navigate(`/sales/${sale.id}`)}
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
