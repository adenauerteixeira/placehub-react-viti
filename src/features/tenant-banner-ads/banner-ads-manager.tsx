import { useState } from 'react'
import { ArrowDown, ArrowUp, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreateButton } from '@/components/create-button'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Switch } from '@/components/ui/switch'
import { TableSkeleton } from '@/components/table-skeleton'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage } from '@/lib/errors'
import {
  bannerAdImageUrl,
  useBannerAds,
  useDeleteBannerAd,
  useMoveBannerAd,
  useToggleBannerAdActive,
  type BannerAd,
} from './api'
import { BannerAdFormDialog } from './banner-ad-form-dialog'
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANT } from './labels'

function formatDate(value: string | null) {
  if (!value) return null
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

export function BannerAdsManager({ tenantId }: { tenantId: string }) {
  const { data: ads, isLoading, isError, refetch } = useBannerAds(tenantId)
  const toggleActive = useToggleBannerAdActive(tenantId)
  const moveAd = useMoveBannerAd(tenantId)
  const deleteAd = useDeleteBannerAd(tenantId)
  const { confirm } = useConfirm()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<BannerAd | null>(null)
  // Precisa vir de `data`, não de uma closure em `columns` — mesmo motivo
  // documentado em brokers-list-page.tsx.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  function withPending(id: string, fn: () => Promise<void>) {
    setPendingIds((prev) => new Set(prev).add(id))
    return fn().finally(() =>
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      }),
    )
  }

  async function handleToggleActive(ad: BannerAd, active: boolean) {
    try {
      await withPending(ad.id, () => toggleActive.mutateAsync({ id: ad.id, active }))
      toast.success(active ? 'Anúncio ativado.' : 'Anúncio desativado.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', { description: errorMessage(error) })
    }
  }

  async function handleMove(ad: BannerAd, direction: 'up' | 'down') {
    if (!ads) return
    try {
      await withPending(ad.id, () => moveAd.mutateAsync({ ads, id: ad.id, direction }))
    } catch (error) {
      toast.error('Não foi possível reordenar', { description: errorMessage(error) })
    }
  }

  async function handleDelete(ad: BannerAd) {
    const confirmed = await confirm({
      title: `Excluir o anúncio de "${ad.company_name}"?`,
      description: 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    })
    if (!confirmed) return

    try {
      await withPending(ad.id, () => deleteAd.mutateAsync(ad))
      toast.success('Anúncio excluído.')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: errorMessage(error) })
    }
  }

  const adsWithPending = ads?.map((a) => ({ ...a, _pending: pendingIds.has(a.id) }))

  const columns: DataTableColumn<BannerAd & { _pending: boolean }>[] = [
    {
      id: 'thumb',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const ad = row.original
        const imageUrl = bannerAdImageUrl(ad.image_path, ad.updated_at)
        return (
          <div className="bg-muted flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border">
            {imageUrl ? (
              <img src={imageUrl} alt={ad.company_name} className="size-full object-cover" />
            ) : (
              <Megaphone className="text-muted-foreground size-4" />
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'company_name',
      header: 'Empresa',
      enableSorting: false,
      cell: ({ row }) => <span className="font-medium">{row.original.company_name}</span>,
    },
    {
      id: 'period',
      header: 'Vigência',
      enableSorting: false,
      cell: ({ row }) => {
        const ad = row.original
        const from = formatDate(ad.starts_at)
        const to = formatDate(ad.ends_at)
        if (!from && !to) return <span className="text-muted-foreground">Sempre</span>
        return (
          <span className="text-muted-foreground">
            {from ?? '—'} – {to ?? '—'}
          </span>
        )
      },
    },
    {
      id: 'payment_status',
      header: 'Pagamento',
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant={PAYMENT_STATUS_VARIANT[row.original.payment_status]}>
          {PAYMENT_STATUS_LABELS[row.original.payment_status]}
        </Badge>
      ),
    },
    {
      id: 'active',
      header: 'Ativo',
      enableSorting: false,
      cell: ({ row }) => (
        <Switch
          checked={row.original.active}
          onCheckedChange={(checked) => handleToggleActive(row.original, checked)}
          disabled={row.original._pending}
          aria-label={row.original.active ? 'Desativar anúncio' : 'Ativar anúncio'}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row, table }) => {
        const ad = row.original
        const rows = table.getRowModel().rows
        const isFirst = rows[0]?.original.id === ad.id
        const isLast = rows[rows.length - 1]?.original.id === ad.id
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mover pra cima"
              disabled={isFirst || ad._pending}
              onClick={() => handleMove(ad, 'up')}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mover pra baixo"
              disabled={isLast || ad._pending}
              onClick={() => handleMove(ad, 'down')}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditing(ad)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir"
              disabled={ad._pending}
              onClick={() => handleDelete(ad)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <CreateButton label="Novo anúncio" size="icon-sm" onClick={() => setCreateOpen(true)} />
      </div>

      {isLoading && <TableSkeleton columns={6} />}

      {isError && <ErrorState title="Não foi possível carregar os anúncios." onRetry={() => refetch()} />}

      {ads && ads.length === 0 && (
        <EmptyState title="Nenhum anúncio de parceiro cadastrado ainda." />
      )}

      {adsWithPending && adsWithPending.length > 0 && (
        <DataTable columns={columns} data={adsWithPending} searchPlaceholder="Buscar por empresa..." />
      )}

      <BannerAdFormDialog open={createOpen} onOpenChange={setCreateOpen} tenantId={tenantId} />
      {editing && (
        <BannerAdFormDialog
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          tenantId={tenantId}
          ad={editing}
        />
      )}
    </div>
  )
}
