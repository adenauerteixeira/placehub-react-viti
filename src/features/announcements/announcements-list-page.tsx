import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateButton } from '@/components/create-button'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableSkeleton } from '@/components/table-skeleton'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage } from '@/lib/errors'
import { ReserveDialog } from '@/features/reservations/reserve-dialog'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useAnnouncements, useDeleteAnnouncement, type Announcement, type AnnouncementStatus } from './api'
import { ANNOUNCEMENT_STATUS_LABELS, ANNOUNCEMENT_STATUS_VARIANT, PROPERTY_TYPE_LABELS } from './labels'

const ALL = '__all__'

export function AnnouncementsListPage() {
  const { tenant } = useTenantOutletContext()
  const navigate = useNavigate()
  const { data: announcements, isLoading, isError, refetch } = useAnnouncements(tenant.id)
  const deleteAnnouncement = useDeleteAnnouncement(tenant.id)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [reserving, setReserving] = useState<string | null>(null)
  const { confirm } = useConfirm()

  async function handleDelete(e: React.MouseEvent, id: string, title: string) {
    e.stopPropagation()
    const confirmed = await confirm({
      title: `Excluir o anúncio "${title}"?`,
      description: 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    })
    if (!confirmed) return
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

  const columns: DataTableColumn<Announcement>[] = [
    {
      accessorKey: 'title',
      header: 'Título',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          {row.original.title}
          {row.original.featured && <Badge variant="outline">Destaque</Badge>}
          {row.original.promotion && <Badge variant="secondary">Promoção</Badge>}
          {row.original.is_assignment && <Badge variant="outline">Cessão</Badge>}
        </div>
      ),
    },
    {
      id: 'property_type',
      accessorFn: (row) => PROPERTY_TYPE_LABELS[row.property_type],
      header: 'Tipo',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      accessorKey: 'price',
      header: 'Preço',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      id: 'status',
      accessorFn: (row) => ANNOUNCEMENT_STATUS_LABELS[row.status],
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={ANNOUNCEMENT_STATUS_VARIANT[row.original.status]}>
          {ANNOUNCEMENT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const announcement = row.original
        return (
          <div className="flex items-center justify-end gap-1">
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
        )
      },
    },
  ]

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
          <CreateButton label="Novo anúncio" asChild>
            <Link to="/announcements/novo">
              <Plus className="size-4" />
            </Link>
          </CreateButton>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading && <TableSkeleton columns={5} />}

        {isError && (
          <ErrorState title="Não foi possível carregar os anúncios." onRetry={() => refetch()} />
        )}

        {filtered.length === 0 && !isLoading && <EmptyState title="Nenhum anúncio encontrado." />}

        {filtered.length > 0 && (
          <DataTable columns={columns} data={filtered} searchPlaceholder="Buscar por título..." />
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
