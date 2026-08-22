import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Tenant } from '@/features/tenants/api'

// Enquanto não existe uma Edge Function com service role para criar o
// usuário via Admin API (ver ROADMAP.md), vincular o primeiro tenant_admin
// de uma imobiliária é manual: criar o usuário em Authentication > Add user
// no painel do Supabase, depois rodar este SQL pra ligá-lo ao tenant.
export function LinkAdminDialog({
  open,
  onOpenChange,
  tenant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant
}) {
  const [email, setEmail] = useState('')

  const sql = `insert into public.profiles (id, tenant_id, role, full_name)
select u.id, t.id, 'tenant_admin', null
from auth.users u, public.tenants t
where u.email = '${email || '<email-do-admin>'}'
  and t.slug = '${tenant.slug}';`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sql)
      toast.success('SQL copiado.')
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular administrador — {tenant.name}</DialogTitle>
          <DialogDescription>
            Ainda não é automático (falta a Edge Function de criação de usuário). Por enquanto:
          </DialogDescription>
        </DialogHeader>

        <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-sm">
          <li>
            No Supabase, vá em <strong className="text-foreground">Authentication → Add user</strong>{' '}
            e crie o usuário (marque <strong className="text-foreground">Auto Confirm User</strong>).
          </li>
          <li>Informe o e-mail usado abaixo.</li>
          <li>Copie o SQL e rode no SQL Editor do Supabase.</li>
        </ol>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-email">E-mail do administrador</Label>
          <Input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@exemplo.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>SQL</Label>
            <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="size-3.5" /> Copiar
            </Button>
          </div>
          <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">{sql}</pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
