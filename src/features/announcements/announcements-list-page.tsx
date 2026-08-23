import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useAnnouncements, type AnnouncementStatus } from './api'
import { ANNOUNCEMENT_STATUS_LABELS, ANNOUNCEMENT_STATUS_VARIANT, PROPERTY_TYPE_LABELS } from './labels'

const ALL = '__all__'

export function AnnouncementsListPage() {
  const { tenant } = useTenantOutletContext()
  const navigate = useNavigate()
  const { data: announcements, isLoading, isError } = useAnnouncements(tenant.id)
  const [statusFilter, setStatusFilter] = useState(ALL)

  const filtered = useMemo(() => {
    if (!announcements) return []
    if (statusFilter === ALL) return announcements
    return announcements.filter((a) => a.status === statusFilter)
  }, [announcements, statusFilter])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anúncios</CardTitle>
        <CardAction className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os status</SelectItem>
              {(Object.keys(ANNOUNCEMENT_STATUS_LABELS) as AnnouncementStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {ANNOUNCEMENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/announcements/novo">
              <Plus className="size-4" /> Novo anúncio
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && <p className="text-destructive text-sm">Não foi possível carregar os anúncios.</p>}

        {filtered.length === 0 && !isLoading && (
          <p className="text-muted-foreground text-sm">Nenhum anúncio encontrado.</p>
        )}

        {filtered.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((announcement) => (
                <TableRow
                  key={announcement.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/announcements/${announcement.id}`)}
                >
                  <TableCell className="font-medium">{announcement.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {PROPERTY_TYPE_LABELS[announcement.property_type]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {announcement.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ANNOUNCEMENT_STATUS_VARIANT[announcement.status]}>
                      {ANNOUNCEMENT_STATUS_LABELS[announcement.status]}
                    </Badge>
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
