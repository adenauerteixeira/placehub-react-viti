import { useMemo, useState } from 'react'
import { Pencil, Plus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { EmptyState, ErrorState } from '@/components/list-state'
import { errorMessage } from '@/lib/errors'
import { Switch } from '@/components/ui/switch'
import { TableSkeleton } from '@/components/table-skeleton'
import { LinkAdminDialog } from '@/features/tenants/link-admin-dialog'
import { TenantFormDialog } from '@/features/tenants/tenant-form-dialog'
import { useTenantAdmins, useTenants, useToggleTenantActive, type Tenant } from '@/features/tenants/api'
import {
  usePlatformBackgroundBorder,
  usePlatformBackgroundUrl,
} from '@/features/platform-branding/use-platform-brand-assets'
import { useTheme } from '@/lib/theme-provider'
import { cn } from '@/lib/utils'

export function TenantsListPage() {
  const { data: tenants, isLoading, isError, refetch } = useTenants()
  const { data: tenantAdmins } = useTenantAdmins()
  const toggleActive = useToggleTenantActive()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const backgroundUrl = usePlatformBackgroundUrl(dark)
  const showBackgroundBorder = usePlatformBackgroundBorder(dark)

  const adminEmailsByTenant = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const admin of tenantAdmins ?? []) {
      map.set(admin.tenant_id, [...(map.get(admin.tenant_id) ?? []), admin.email])
    }
    return map
  }, [tenantAdmins])

  const [createOpen, setCreateOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [linkingTenant, setLinkingTenant] = useState<Tenant | null>(null)
  // Precisa vir de `data`, não de uma closure em `columns` — ver nota em
  // partners-list-page.tsx.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  async function handleToggleActive(tenant: Tenant, active: boolean) {
    setPendingIds((prev) => new Set(prev).add(tenant.id))
    try {
      await toggleActive.mutateAsync({ id: tenant.id, active })
      toast.success(active ? 'Imobiliária ativada.' : 'Imobiliária desativada.')
    } catch (error) {
      toast.error('Não foi possível atualizar o status', {
        description: errorMessage(error),
      })
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(tenant.id)
        return next
      })
    }
  }

  const tenantsWithPending = tenants?.map((t) => ({ ...t, _pending: pendingIds.has(t.id) }))

  const columns: DataTableColumn<Tenant & { _pending: boolean }>[] = [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'slug',
      header: 'Subdomínio',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'admins',
      accessorFn: (row) => (adminEmailsByTenant.get(row.id) ?? []).join(', ') || '—',
      header: 'Administrador',
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    },
    {
      id: 'active',
      accessorFn: (row) => (row.active ? 'Ativa' : 'Inativa'),
      header: 'Status',
      cell: ({ row }) => {
        const tenant = row.original
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={tenant.active}
              onCheckedChange={(checked) => handleToggleActive(tenant, checked)}
              disabled={tenant._pending}
              aria-label={tenant.active ? 'Desativar imobiliária' : 'Ativar imobiliária'}
            />
            <Badge variant={tenant.active ? 'default' : 'secondary'}>
              {tenant.active ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Criada em',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar"
            onClick={() => setEditingTenant(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Vincular administrador"
            onClick={() => setLinkingTenant(row.original)}
          >
            <UserPlus className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {backgroundUrl && (
        <div
          className={cn('w-1/3 min-w-48 overflow-hidden rounded-xl', showBackgroundBorder && 'border')}
        >
          <img src={backgroundUrl} alt="" className="block h-auto w-full" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Imobiliárias</CardTitle>
          <CardAction>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> <span className="hidden sm:inline">Nova imobiliária</span>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {isLoading && <TableSkeleton columns={6} />}

          {isError && (
            <ErrorState title="Não foi possível carregar as imobiliárias." onRetry={() => refetch()} />
          )}

          {tenants && tenants.length === 0 && (
            <EmptyState title="Nenhuma imobiliária cadastrada ainda." />
          )}

          {tenantsWithPending && tenantsWithPending.length > 0 && (
            <DataTable
              columns={columns}
              data={tenantsWithPending}
              searchPlaceholder="Buscar por nome, subdomínio..."
            />
          )}
        </CardContent>

        <TenantFormDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setLinkingTenant} />
        <TenantFormDialog
          open={!!editingTenant}
          onOpenChange={(open) => !open && setEditingTenant(null)}
          tenant={editingTenant ?? undefined}
        />
        {linkingTenant && (
          <LinkAdminDialog
            open={!!linkingTenant}
            onOpenChange={(open) => !open && setLinkingTenant(null)}
            tenant={linkingTenant}
          />
        )}
      </Card>
    </div>
  )
}
