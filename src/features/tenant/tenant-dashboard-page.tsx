import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantOutletContext } from '@/features/tenant/tenant-layout'

export function TenantDashboardPage() {
  const { profile } = useTenantOutletContext()

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Bem-vindo{profile.full_name ? `, ${profile.full_name}` : ''}</CardTitle>
        <CardDescription>
          O painel com indicadores comerciais chega na Fase 4 do roadmap. Por enquanto, isto
          confirma que o login, a resolução de tenant e as permissões estão funcionando.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">Papel: {profile.role}</CardContent>
    </Card>
  )
}
