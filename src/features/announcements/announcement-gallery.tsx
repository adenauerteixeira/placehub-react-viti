import { useRef } from 'react'
import { Loader2, Star, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errors'
import {
  announcementImageUrl,
  useAnnouncementImages,
  useRemoveAnnouncementImage,
  useSetCoverImage,
  useUploadAnnouncementImage,
} from './api'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

export function AnnouncementGallery({
  announcementId,
  tenantId,
}: {
  announcementId: string
  tenantId: string
}) {
  const { data: images } = useAnnouncementImages(announcementId)
  const upload = useUploadAnnouncementImage(announcementId, tenantId)
  const remove = useRemoveAnnouncementImage(announcementId)
  const setCover = useSetCoverImage(announcementId)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    for (const file of files) {
      if (file.size > MAX_SIZE_BYTES) {
        toast.error('Arquivo muito grande', { description: `${file.name}: o limite é 5 MB.` })
        continue
      }
      try {
        await upload.mutateAsync(file)
      } catch (error) {
        toast.error(`Não foi possível enviar ${file.name}`, {
          description: errorMessage(error),
        })
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Envie as fotos do imóvel. A primeira enviada vira a capa — clique na estrela pra trocar.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
          Enviar fotos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleFilesChange}
        />
      </div>

      {images && images.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma foto enviada ainda.</p>
      )}

      {images && images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative overflow-hidden rounded-lg border">
              <img
                src={announcementImageUrl(image.path)}
                alt=""
                className="aspect-square w-full object-cover"
              />
              {image.is_cover && (
                <span className="bg-primary text-primary-foreground absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium">
                  Capa
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20 hover:text-white"
                  disabled={image.is_cover || setCover.isPending}
                  onClick={() => setCover.mutate(image.id)}
                  aria-label="Definir como capa"
                >
                  <Star className={cn('size-3.5', image.is_cover && 'fill-current')} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white hover:bg-white/20 hover:text-white"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(image)}
                  aria-label="Remover foto"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
