import { useState } from 'react'
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

// Backups automáticos grandes sobem em partes (nome.zip.part001, .part002,
// ...) — o plano Free do Supabase trava upload em 50MB por objeto (ver
// comentário em supabase/functions/run-scheduled-backups/index.ts). Cada
// linha da lista representa um backup lógico (todas as partes juntas), não
// um objeto do bucket.
type BackupFile = { name: string; size: number }
type BackupGroup = { name: string; parts: BackupFile[]; totalSize: number }
type SaveFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>
    close: () => Promise<void>
    abort?: () => Promise<void>
  }>
}

type SaveFileWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<SaveFileHandle>
}

function groupBackupFiles(files: { name: string; metadata?: { size?: number } | null }[]): BackupGroup[] {
  const groups = new Map<string, BackupGroup>()
  for (const file of files) {
    const name = file.name.replace(/\.part\d{3}$/, '')
    const size = file.metadata?.size ?? 0
    const group = groups.get(name) ?? { name, parts: [], totalSize: 0 }
    group.parts.push({ name: file.name, size })
    group.totalSize += size
    groups.set(name, group)
  }
  for (const group of groups.values()) {
    group.parts.sort((a, b) => a.name.localeCompare(b.name))
  }
  return [...groups.values()].sort((a, b) => b.name.localeCompare(a.name))
}

function useRecentBackups(tenantId: string) {
  return useQuery({
    queryKey: ['recent-backups', tenantId],
    queryFn: async (): Promise<BackupGroup[]> => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(tenantId, { sortBy: { column: 'name', order: 'desc' } })

      if (error) throw error
      return groupBackupFiles(data ?? [])
    },
  })
}

function useDeleteBackup(tenantId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (group: BackupGroup) => {
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove(group.parts.map((part) => `${tenantId}/${part.name}`))
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function RecentBackupsList({ tenantId }: { tenantId: string }) {
  const { data: groups, isLoading, isError, refetch } = useRecentBackups(tenantId)
  const deleteBackup = useDeleteBackup(tenantId)
  const { confirm } = useConfirm()
  const [downloadingName, setDownloadingName] = useState<string | null>(null)

  async function handleDownload(group: BackupGroup) {
    setDownloadingName(group.name)
    try {
      // Chromium permite gravar uma parte por vez no disco. Assim, um backup
      // de 500 MB não precisa existir inteiro como Blob/ArrayBuffer na RAM do
      // navegador; no fallback, mantemos o comportamento compatível atual.
      const filePicker = (window as SaveFileWindow).showSaveFilePicker
      if (filePicker) {
        const fileHandle = await filePicker({
          suggestedName: group.name,
          types: [{ description: 'Backup ZIP', accept: { 'application/zip': ['.zip'] } }],
        })
        const writable = await fileHandle.createWritable()
        try {
          for (const part of group.parts) {
            const { data, error } = await supabase.storage.from(BUCKET).download(`${tenantId}/${part.name}`)
            if (error || !data) throw error ?? new Error('parte do backup ausente')
            await writable.write(data)
          }
          await writable.close()
          toast.success('Backup salvo.')
          return
        } catch (error) {
          await writable.abort?.()
          throw error
        }
      }

      const blobParts: Blob[] = []
      for (const part of group.parts) {
        const { data, error } = await supabase.storage.from(BUCKET).download(`${tenantId}/${part.name}`)
        if (error || !data) {
          toast.error('Não foi possível baixar o backup', { description: errorMessage(error) })
          return
        }
        blobParts.push(data)
      }

      const blob = new Blob(blobParts, { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = group.name
      a.click()
      // O navegador pode iniciar o download depois do click; revogar no mesmo
      // tick falha intermitentemente em alguns browsers.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      toast.success('Download iniciado.')
    } catch (error) {
      if (!isAbortError(error)) {
        toast.error('Não foi possível baixar o backup', { description: errorMessage(error) })
      }
    } finally {
      setDownloadingName(null)
    }
  }

  async function handleDelete(group: BackupGroup) {
    const confirmed = await confirm({
      title: `Excluir "${group.name}"?`,
      description: 'Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    })
    if (!confirmed) return

    try {
      await deleteBackup.mutateAsync(group)
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

  if (!groups || groups.length === 0) {
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
      {groups.map((group) => (
        <div key={group.name} className="flex items-center gap-3 rounded-lg border p-2">
          <FileArchive className="text-muted-foreground size-4 shrink-0" />
          <span className="flex-1 truncate text-sm">{group.name}</span>
          <span className="text-muted-foreground text-xs">{formatSize(group.totalSize)}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Baixar"
            disabled={downloadingName === group.name}
            onClick={() => handleDownload(group)}
          >
            {downloadingName === group.name ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir"
            disabled={deleteBackup.isPending}
            onClick={() => handleDelete(group)}
          >
            {deleteBackup.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </div>
      ))}
    </div>
  )
}
