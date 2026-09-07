import { useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/hooks/use-confirm'
import { supabase } from '@/lib/supabase'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { BackupScheduleManager } from '@/features/tenant-backup-schedules/backup-schedule-manager'
import { RecentBackupsList } from '@/features/tenant-backup-schedules/recent-backups-list'

async function readInvokeError(error: { message: string; context?: Response }) {
  let message = error.message
  try {
    const body = await error.context?.json()
    if (body?.error) message = body.error
  } catch {
    // resposta sem corpo JSON legível — mantém error.message
  }
  return message
}

export function BackupPage() {
  const { tenant } = useTenantOutletContext()
  const { confirm } = useConfirm()

  const [downloading, setDownloading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [restoring, setRestoring] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    const { data, error } = await supabase.functions.invoke('backup-tenant-data', {
      method: 'POST',
    })
    setDownloading(false)

    if (error) {
      const message = await readInvokeError(error)
      toast.error('Não foi possível gerar o backup', { description: message })
      return
    }

    const blob = data instanceof Blob ? data : new Blob([data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `backup-${tenant.slug}-${date}.zip`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup gerado.')
  }

  async function handleRestore() {
    if (!file) {
      toast.error('Selecione um arquivo de backup (.zip).')
      return
    }
    if (!password) {
      toast.error('Informe sua senha pra confirmar.')
      return
    }

    const confirmed = await confirm({
      title: 'Confirmar restauração de backup',
      description:
        'Isso vai apagar TODOS os dados atuais da imobiliária (anúncios, corretores, leads, negociações, propostas, reservas, vendas, comissões e anúncios de banner) — inclusive o que foi cadastrado depois deste backup — e substituir pelo conteúdo do arquivo. Não pode ser desfeito.',
      confirmLabel: 'Restaurar backup',
      variant: 'destructive',
    })
    if (!confirmed) return

    const formData = new FormData()
    formData.append('password', password)
    formData.append('file', file)

    setRestoring(true)
    const { error } = await supabase.functions.invoke('restore-tenant-data', {
      body: formData,
    })
    setRestoring(false)

    if (error) {
      const message = await readInvokeError(error)
      toast.error('Não foi possível restaurar o backup', { description: message })
      return
    }

    toast.success('Backup restaurado. Recarregando a página...')
    window.location.reload()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Fazer backup</CardTitle>
          <CardDescription>
            Baixa um arquivo com todos os dados de negócio da imobiliária — empreendimentos,
            parceiros, corretores, proprietários, anúncios (com fotos), leads, negociações,
            propostas, reservas, vendas, comissões e anúncios de banner — além dos comprovantes de
            pagamento anexados. Não inclui usuários/contas nem identidade visual (cores, logo,
            textos), que continuam nas próprias telas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            Baixar backup agora
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos automáticos</CardTitle>
          <CardDescription>
            Escolha dias e horários pra o sistema gerar um backup sozinho, sem precisar clicar em
            nada. Os 10 backups agendados mais recentes ficam guardados e disponíveis pra download
            abaixo — os mais antigos além disso são apagados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <BackupScheduleManager tenantId={tenant.id} />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Backups automáticos recentes</span>
            <RecentBackupsList tenantId={tenant.id} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restaurar backup</CardTitle>
          <CardDescription>
            Substitui todos os dados atuais pelo conteúdo de um arquivo de backup gerado
            anteriormente. Ação exclusiva do administrador, irreversível.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restore-file">Arquivo de backup (.zip)</Label>
            <Input
              id="restore-file"
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restore-password">Confirme sua senha</Label>
            <Input
              id="restore-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            variant="destructive"
            disabled={restoring || !file || !password}
            onClick={handleRestore}
            className="self-start"
          >
            {restoring && <Loader2 className="animate-spin" />}
            <Upload />
            Restaurar backup
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
