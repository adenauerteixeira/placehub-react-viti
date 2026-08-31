import { useRef } from 'react'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/errors'
import {
  type PlatformBrandingAsset,
  useRemovePlatformBrandingAsset,
  useUploadPlatformBrandingAsset,
} from './api'

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon'

export function PlatformUploadField({
  asset,
  label,
  currentPath,
  previewUrl,
}: {
  asset: PlatformBrandingAsset
  label: string
  currentPath: string | null
  previewUrl: string | null
}) {
  const upload = useUploadPlatformBrandingAsset()
  const remove = useRemovePlatformBrandingAsset()
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = upload.isPending || remove.isPending

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Arquivo muito grande', { description: 'O limite é 2 MB.' })
      return
    }

    try {
      await upload.mutateAsync({ asset, file })
      toast.success(`${label} atualizado.`)
    } catch (error) {
      toast.error(`Não foi possível enviar ${label.toLowerCase()}`, {
        description: errorMessage(error),
      })
    }
  }

  async function handleRemove() {
    if (!currentPath) return
    try {
      await remove.mutateAsync({ asset, currentPath })
      toast.success(`${label} removido.`)
    } catch (error) {
      toast.error(`Não foi possível remover ${label.toLowerCase()}`, {
        description: errorMessage(error),
      })
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="bg-checkerboard relative size-16 shrink-0 overflow-hidden rounded-lg border">
          <div className="absolute inset-0 flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt={label} className="size-full object-contain" />
            ) : (
              <span className="text-muted-foreground text-center text-[10px] leading-tight">
                Sem imagem
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
            Enviar imagem
          </Button>
          {currentPath && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={handleRemove}>
              {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Remover
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  )
}
