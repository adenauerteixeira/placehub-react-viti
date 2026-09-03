import { useState } from 'react'
import { ArrowDown, ArrowUp, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreateButton } from '@/components/create-button'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { ErrorState } from '@/components/list-state'
import { Switch } from '@/components/ui/switch'
import { TableSkeleton } from '@/components/table-skeleton'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage } from '@/lib/errors'
import { brandingAssetUrl, useToggleOwnBannerActive } from '@/features/tenant-branding/api'
import { OwnBannerFormDialog } from '@/features/tenant-branding/own-banner-form-dialog'
import type { Tenant } from '@/features/tenants/api'
import {
  bannerAdImageUrl,
  isBannerAdExpired,
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

type OwnRow = { kind: 'own'; _pending: boolean }
type SponsorRow = BannerAd & { kind: 'sponsor'; _pending: boolean }
type Row = OwnRow | SponsorRow

export function BannerAdsManager({
  tenant,
  showSponsors,
}: {
  tenant: Tenant
  showSponsors: boolean
}) {
  const tenantId = tenant.id
  const { data: ads, isLoading, isError, refetch } = useBannerAds(tenantId)
  const toggleActive = useToggleBannerAdActive(tenantId)
  const toggleOwnActive = useToggleOwnBannerActive(tenantId)
  const moveAd = useMoveBannerAd(tenantId)
  const deleteAd = useDeleteBannerAd(tenantId)
  const { confirm } = useConfirm()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingOwn, setEditingOwn] = useState(false)
  const editing = ads?.find((a) => a.id === editingId) ?? null
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

  async function handleToggleOwnActive(active: boolean) {
    try {
      await withPending('own', () => toggleOwnActive.mutateAsync(active))
      toast.success(active ? 'Banner próprio incluído no carrossel.' : 'Banner próprio removido do carrossel.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', { description: errorMessage(error) })
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

  const ownImageUrl = brandingAssetUrl(tenant.background_image_path, tenant.updated_at)
  const ownPending = pendingIds.has('own')

  const ownRow: OwnRow = { kind: 'own', _pending: ownPending }
  const sponsorRows: SponsorRow[] =
    ads?.map((a) => ({ ...a, kind: 'sponsor' as const, _pending: pendingIds.has(a.id) })) ?? []
  const data: Row[] = [ownRow, ...sponsorRows]

  // Colunas únicas pra Banner Próprio e patrocinadores compartilharem a
  // mesma tabela — garante que fiquem pixel a pixel alinhados (uma tabela
  // real, não duas UIs parecidas tentando bater largura por acaso).
  const columns: DataTableColumn<Row>[] = [
    {
      id: 'thumb',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const r = row.original
        const imageUrl = r.kind === 'own' ? ownImageUrl : bannerAdImageUrl(r.image_path, r.updated_at)
        const alt = r.kind === 'own' ? 'Banner próprio' : r.company_name
        return (
          <div className="bg-muted flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border">
            {imageUrl ? (
              <img src={imageUrl} alt={alt} className="size-full object-cover" />
            ) : (
              <Megaphone className="text-muted-foreground size-4" />
            )}
          </div>
        )
      },
    },
    {
      id: 'company_name',
      header: 'Empresa',
      enableSorting: false,
      accessorFn: (r) => (r.kind === 'own' ? 'Banner próprio' : r.company_name),
      cell: ({ row }) => {
        const r = row.original
        return <span className="font-medium">{r.kind === 'own' ? 'Banner próprio' : r.company_name}</span>
      },
    },
    {
      id: 'period',
      header: 'Vigência',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        if (r.kind === 'own') return <Badge variant="outline">Fixo</Badge>
        const from = formatDate(r.starts_at)
        const to = formatDate(r.ends_at)
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
      cell: ({ row }) => {
        const r = row.original
        if (r.kind === 'own') return <span className="text-muted-foreground">—</span>
        return (
          <Badge variant={PAYMENT_STATUS_VARIANT[r.payment_status]}>
            {PAYMENT_STATUS_LABELS[r.payment_status]}
          </Badge>
        )
      },
    },
    {
      id: 'display_seconds',
      header: 'Duração',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        const seconds = r.kind === 'own' ? tenant.public_hero_display_seconds : r.display_seconds
        return <span className="text-muted-foreground">{seconds ? `${seconds}s` : 'Padrão'}</span>
      },
    },
    {
      id: 'active',
      header: 'Ativo',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original
        if (r.kind === 'own') {
          return (
            <Switch
              checked={tenant.public_hero_own_active}
              onCheckedChange={handleToggleOwnActive}
              disabled={r._pending}
              aria-label={
                tenant.public_hero_own_active
                  ? 'Remover banner próprio do carrossel'
                  : 'Incluir banner próprio no carrossel'
              }
            />
          )
        }
        const expired = isBannerAdExpired(r)
        return (
          <Switch
            checked={expired ? false : r.active}
            onCheckedChange={(checked) => handleToggleActive(r, checked)}
            disabled={r._pending || expired}
            aria-label={r.active ? 'Desativar anúncio' : 'Ativar anúncio'}
            title={expired ? 'Vigência encerrada — reative estendendo a data de fim.' : undefined}
          />
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row, table }) => {
        const r = row.original
        if (r.kind === 'own') {
          return (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" aria-label="Mover pra cima" disabled>
                <ArrowUp className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Mover pra baixo" disabled>
                <ArrowDown className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditingOwn(true)}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Excluir" disabled>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        }

        const visibleSponsorRows = table
          .getRowModel()
          .rows.map((x) => x.original)
          .filter((o): o is SponsorRow => o.kind === 'sponsor')
        const isFirst = visibleSponsorRows[0]?.id === r.id
        const isLast = visibleSponsorRows[visibleSponsorRows.length - 1]?.id === r.id
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mover pra cima"
              disabled={isFirst || r._pending}
              onClick={() => handleMove(r, 'up')}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mover pra baixo"
              disabled={isLast || r._pending}
              onClick={() => handleMove(r, 'down')}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditingId(r.id)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir"
              disabled={r._pending}
              onClick={() => handleDelete(r)}
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
      {!showSponsors && (
        <div className="rounded-lg border p-2">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border">
              {ownImageUrl ? (
                <img src={ownImageUrl} alt="Banner próprio" className="size-full object-cover" />
              ) : (
                <Megaphone className="text-muted-foreground size-4" />
              )}
            </div>
            <span className="flex-1 font-medium">Banner próprio</span>
            <Switch
              checked={tenant.public_hero_own_active}
              onCheckedChange={handleToggleOwnActive}
              disabled={ownPending}
              aria-label={
                tenant.public_hero_own_active
                  ? 'Remover banner próprio do carrossel'
                  : 'Incluir banner próprio no carrossel'
              }
            />
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditingOwn(true)}>
              <Pencil className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {showSponsors && (
        <>
          {isLoading && <TableSkeleton columns={7} />}
          {isError && <ErrorState title="Não foi possível carregar os anúncios." onRetry={() => refetch()} />}
          {!isLoading && !isError && (
            <DataTable
              columns={columns}
              data={data}
              searchPlaceholder="Buscar por empresa..."
              toolbarEnd={<CreateButton label="Novo anúncio" size="icon-sm" onClick={() => setCreateOpen(true)} />}
            />
          )}
        </>
      )}

      <OwnBannerFormDialog open={editingOwn} onOpenChange={setEditingOwn} tenant={tenant} />

      {showSponsors && (
        <>
          <BannerAdFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            tenantId={tenantId}
            badgeOpacity={tenant.public_hero_badge_opacity}
          />
          {editing && (
            <BannerAdFormDialog
              open={!!editing}
              onOpenChange={(open) => !open && setEditingId(null)}
              tenantId={tenantId}
              badgeOpacity={tenant.public_hero_badge_opacity}
              ad={editing}
            />
          )}
        </>
      )}
    </div>
  )
}
