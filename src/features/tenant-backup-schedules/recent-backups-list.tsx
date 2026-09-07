import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileArchive, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/list-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

const BUCKET = 'tenant-backups'

function useRecentBackups(tenantId: string) {
  return useQuery({
    queryKey: ['recent-backups', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(tenantId, { sortBy: { column: 'name', order: 'desc' } })

      if (error) throw error
      return data
    },
  })
}

function useDeleteBackupFile(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([`${tenantId}/${name}`])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-backups', tenantId] })
    },
  })
}

function formatSize(bytes: number | undefined) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

export function RecentBackupsList({ tenantId }: { tenantId: string }) {
  const { data: files, isLoading, isError, refetch } = useRecentBackups(tenantId)
  const deleteFile = useDeleteBackupFile(tenantId)
  const { confirm } = useConfirm()

  async function handleDownload(name: string) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(`${tenantId}/${name}`, 60)

    if (error || !data) {
      toast.error('Não foi possível gerar o link de download', { description: errorMessage(error) })
      return
    }

    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(name: string) {
    const confirmed = await confirm({
      title: `Excluir "${name}"?`,
      description: 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    })
    if (!confirmed) return

    try {
      await deleteFile.mutateAsync(name)
      toast.success('Backup excluído.')
    } catch (error) {
      toast.error('Não foi possível excluir', { description: errorMessage(error) })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (isError) {
    return <ErrorState title="Não foi possível carregar os backups automáticos." onRetry={() => refetch()} />
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        icon={FileArchive}
        title="Nenhum backup automático ainda"
        description="Assim que um agendamento rodar, os backups mais recentes aparecem aqui."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => (
        <div key={file.name} className="flex items-center gap-3 rounded-lg border p-2">
          <FileArchive className="text-muted-foreground size-4 shrink-0" />
          <span className="flex-1 truncate text-sm">{file.name}</span>
          <span className="text-muted-foreground text-xs">{formatSize(file.metadata?.size)}</span>
          <Button variant="ghost" size="icon" aria-label="Baixar" onClick={() => handleDownload(file.name)}>
            <Download className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir"
            disabled={deleteFile.isPending}
            onClick={() => handleDelete(file.name)}
          >
            {deleteFile.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      ))}
    </div>
  )
}
