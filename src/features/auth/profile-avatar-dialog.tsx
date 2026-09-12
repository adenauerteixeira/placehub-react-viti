import { useRef } from 'react'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { errorMessage } from '@/lib/errors'
import type { Profile } from './use-profile'
import { useProfileAvatarUrl, useRemoveProfileAvatar, useUploadProfileAvatar } from './profile-avatar'

function initials(profile: Profile): string {
  return (profile.full_name?.trim() || profile.email || '?').split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export function ProfileAvatarDialog({ open, onOpenChange, profile }: { open: boolean; onOpenChange: (open: boolean) => void; profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadProfileAvatar()
  const remove = useRemoveProfileAvatar()
  const { data: avatarUrl } = useProfileAvatarUrl(profile.avatar_path, profile.updated_at)
  const pending = upload.isPending || remove.isPending

  async function selectFile(file: File | undefined) {
    if (!file) return
    try {
      await upload.mutateAsync({ profile, file })
      toast.success('Foto atualizada.')
    } catch (error) {
      toast.error('Não foi possível atualizar a foto', { description: errorMessage(error) })
    }
  }

  async function removeAvatar() {
    try {
      await remove.mutateAsync(profile)
      toast.success('Foto removida.')
    } catch (error) {
      toast.error('Não foi possível remover a foto', { description: errorMessage(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Foto do perfil</DialogTitle>
          <DialogDescription>Use PNG, JPEG ou WebP de até 2 MB.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <Avatar size="lg"><AvatarImage src={avatarUrl ?? undefined} /><AvatarFallback>{initials(profile)}</AvatarFallback></Avatar>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = '' }} />
        <DialogFooter className="sm:justify-between">
          {profile.avatar_path ? <Button type="button" variant="ghost" onClick={removeAvatar} disabled={pending}><Trash2 /> Remover</Button> : <span />}
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Upload />}
            Enviar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
