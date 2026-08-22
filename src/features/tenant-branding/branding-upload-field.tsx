import { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { type BrandingAsset, useUploadBrandingAsset } from './api'

const MAX_SIZE_BYTES = 2 * 1024 * 1024

export function BrandingUploadField({
  tenantId,
  asset,
  label,
  previewUrl,
  previewBg = 'bg-muted',
}: {
  tenantId: string
  asset: BrandingAsset
  label: string
  previewUrl: string | null
  previewBg?: string
}) {
  const upload = useUploadBrandingAsset(tenantId)
  const inputRef = useRef<HTMLInputElement>(null)

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
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className={`flex size-16 items-center justify-center overflow-hidden rounded-lg border ${previewBg}`}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="size-full object-contain" />
          ) : (
            <span className="text-muted-foreground text-xs">Sem imagem</span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
          Enviar imagem
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
