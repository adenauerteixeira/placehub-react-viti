import { useState } from 'react'
import { Camera, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { useProfile } from './use-profile'
import { profileAvatarUrl } from './profile-avatar'
import { ProfileAvatarDialog } from './profile-avatar-dialog'

function initials(name: string | null, email: string | undefined): string {
  const source = name?.trim() || email || '?'
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function UserMenu({ name, email }: { name: string | null; email: string | undefined }) {
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  const avatarUrl = profileAvatarUrl(profile?.avatar_path ?? null, profile?.updated_at ?? null)

  async function handleLogout() {
    await supabase.auth.signOut()
    queryClient.clear()
  }

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu do usuário">
          <Avatar className="size-8">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback>{initials(name, email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{name || 'Sem nome'}</span>
          <span className="text-muted-foreground text-xs font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profile && (
          <DropdownMenuItem onClick={() => setAvatarDialogOpen(true)}>
            <Camera className="size-4" /> Alterar foto
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled className="cursor-default opacity-100">
          <span className="text-muted-foreground text-xs">Versão v{__APP_VERSION__}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="size-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
      {profile && <ProfileAvatarDialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen} profile={profile} />}
    </>
  )
}
