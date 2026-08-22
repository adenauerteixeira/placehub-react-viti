import { Navigate, Route, Routes } from 'react-router-dom'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { NotFoundPage } from '@/components/not-found-page'
import { useAuth } from '@/features/auth/auth-context'
import { LoginPage } from '@/features/auth/login-page'
import { useProfile, type Profile } from '@/features/auth/use-profile'
import { PlatformLayout } from '@/features/platform/platform-layout'
import { TenantsListPage } from '@/features/platform/tenants-list-page'
import { TenantDashboardPage } from '@/features/tenant/tenant-dashboard-page'
import { TenantLayout } from '@/features/tenant/tenant-layout'
import { useTenant } from '@/features/tenants/api'
import { platformUrl, resolveSubdomainContext, tenantUrl, type SubdomainContext } from '@/lib/subdomain'
import { useRedirectOnce } from '@/lib/use-redirect-once'

export function AppShell() {
  const { session, loading } = useAuth()

  if (loading) return <FullscreenSpinner />
  if (!session) return <LoginPage />

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const { data: profile, isLoading, isError } = useProfile()

  if (isLoading) return <FullscreenSpinner />
  if (isError || !profile) {
    return (
      <FullscreenMessage
        title="Não foi possível carregar seu perfil"
        description="Tente recarregar a página em instantes."
      />
    )
  }

  if (!profile.is_active) {
    return (
      <FullscreenMessage
        title="Conta inativa"
        description="Fale com o administrador da sua imobiliária."
      />
    )
  }

  const context = resolveSubdomainContext()

  return profile.role === 'super_admin' ? (
    <PlatformGate context={context} profile={profile} />
  ) : (
    <TenantGate context={context} profile={profile} />
  )
}

function PlatformGate({ context, profile }: { context: SubdomainContext; profile: Profile }) {
  const shouldRedirect = context.kind !== 'platform'
  useRedirectOnce(shouldRedirect ? platformUrl() : null)

  if (shouldRedirect) return <FullscreenSpinner />

  return (
    <Routes>
      <Route element={<PlatformLayout profile={profile} />}>
        <Route path="/" element={<Navigate to="/tenants" replace />} />
        <Route path="/tenants" element={<TenantsListPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function TenantGate({ context, profile }: { context: SubdomainContext; profile: Profile }) {
  const { data: tenant, isLoading, isError } = useTenant(profile.tenant_id)

  const shouldRedirect = !!tenant && (context.kind !== 'tenant' || context.slug !== tenant.slug)
  useRedirectOnce(shouldRedirect && tenant ? tenantUrl(tenant.slug) : null)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !tenant) {
    return <FullscreenMessage title="Imobiliária não encontrada" />
  }
  if (shouldRedirect) return <FullscreenSpinner />

  if (!tenant.active) {
    return (
      <FullscreenMessage
        title={tenant.name}
        description="Esta imobiliária está temporariamente inativa."
      />
    )
  }

  return (
    <Routes>
      <Route element={<TenantLayout tenant={tenant} profile={profile} />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<TenantDashboardPage profile={profile} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
