import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage } from '@/lib/errors'
import { ReserveDialog } from '@/features/reservations/reserve-dialog'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useAnnouncements, useDeleteAnnouncement, type AnnouncementStatus } from './api'
import { ANNOUNCEMENT_STATUS_LABELS, ANNOUNCEMENT_STATUS_VARIANT, PROPERTY_TYPE_LABELS } from './labels'

const ALL = '__all__'

export function AnnouncementsListPage() {
  const { tenant } = useTenantOutletContext()
  const navigate = useNavigate()
  const { data: announcements, isLoading, isError } = useAnnouncements(tenant.id)
  const deleteAnnouncement = useDeleteAnnouncement(tenant.id)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [reserving, setReserving] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, id: string, title: string) {
    e.stopPropagation()
    if (!window.confirm(`Excluir o anúncio "${title}"? Essa ação não pode ser desfeita.`)) return
    try {
      await deleteAnnouncement.mutateAsync(id)
      toast.success('Anúncio excluído.')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: errorMessage(error) })
    }
  }

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
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((announcement) => (
                <TableRow key={announcement.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {announcement.title}
                      {announcement.featured && <Badge variant="outline">Destaque</Badge>}
                      {announcement.promotion && <Badge variant="secondary">Promoção</Badge>}
                    </div>
                  </TableCell>
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
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {announcement.status === 'published' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Reservar"
                          onClick={() => setReserving(announcement.id)}
                        >
                          <CalendarPlus className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => navigate(`/announcements/${announcement.id}`)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(e, announcement.id, announcement.title)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {reserving && (
        <ReserveDialog
          open={!!reserving}
          onOpenChange={(open) => !open && setReserving(null)}
          announcementId={reserving}
        />
      )}
    </Card>
  )
}
