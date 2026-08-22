import { Navigate, Route, Routes } from 'react-router-dom'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { NotFoundPage } from '@/components/not-found-page'
import { useAuth } from '@/features/auth/auth-context'
import { LoginPage } from '@/features/auth/login-page'
import { useProfile } from '@/features/auth/use-profile'
import { PlatformLayout } from '@/features/platform/platform-layout'
import { TenantsListPage } from '@/features/platform/tenants-list-page'
import { PublicTenantHomePage } from '@/features/tenant/public-home-page'
import { TenantDashboardPage } from '@/features/tenant/tenant-dashboard-page'
import { TenantLayout, useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useTenant } from '@/features/tenants/api'
import { TenantBrandingPage } from '@/features/tenant-branding/tenant-branding-page'
import { TenantUsersPage } from '@/features/tenant-users/tenant-users-page'
import { platformUrl, resolveSubdomainContext, tenantUrl } from '@/lib/subdomain'
import { useRedirectOnce } from '@/lib/use-redirect-once'

// A home de cada contexto é pública (portal de anúncios no tenant, nada no
// apex); login é uma rota própria (/login), não o "portão" do app inteiro —
// mesmo comportamento do sistema anterior (tenant.home público vs.
// plataforma/login). Ver ARCHITECTURE.md.
export function AppShell() {
  const { loading } = useAuth()
  if (loading) return <FullscreenSpinner />

  const context = resolveSubdomainContext()

  if (context.kind === 'tenant') return <TenantApp slug={context.slug} />
  if (context.kind === 'platform') return <PlatformApp />
  return <ApexRedirect />
}

function ApexRedirect() {
  useRedirectOnce(platformUrl())
  return <FullscreenSpinner />
}

function TenantApp({ slug }: { slug: string }) {
  const { session } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<PublicTenantHomePage slug={slug} />} />
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route element={<TenantProtectedShell slug={slug} />}>
        <Route path="/dashboard" element={<TenantDashboardPage />} />
        <Route
          path="/users"
          element={
            <RequireTenantAdmin>
              <TenantUsersPage />
            </RequireTenantAdmin>
          }
        />
        <Route
          path="/branding"
          element={
            <RequireTenantAdmin>
              <TenantBrandingPage />
            </RequireTenantAdmin>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function RequireTenantAdmin({ children }: { children: React.ReactNode }) {
  const { profile } = useTenantOutletContext()
  if (profile.role !== 'tenant_admin') {
    return (
      <FullscreenMessage
        title="Sem permissão"
        description="Essa área é restrita ao administrador da imobiliária."
      />
    )
  }
  return children
}

function TenantProtectedShell({ slug }: { slug: string }) {
  const { session } = useAuth()
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile()
  const { data: tenant, isLoading: tenantLoading, isError: tenantError } = useTenant(
    profile?.tenant_id,
  )

  const isSuperAdmin = profile?.role === 'super_admin'
  const tenantMismatch = !!tenant && tenant.slug !== slug
  const redirectUrl = isSuperAdmin ? platformUrl() : tenantMismatch ? tenantUrl(tenant!.slug) : null
  useRedirectOnce(redirectUrl)

  if (!session) return <Navigate to="/login" replace />
  if (profileLoading) return <FullscreenSpinner />
  if (profileError || !profile) {
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
  if (isSuperAdmin) return <FullscreenSpinner />
  if (tenantLoading) return <FullscreenSpinner />
  if (tenantError || !tenant) return <FullscreenMessage title="Imobiliária não encontrada" />
  if (tenantMismatch) return <FullscreenSpinner />
  if (!tenant.active) {
    return (
      <FullscreenMessage
        title={tenant.name}
        description="Esta imobiliária está temporariamente inativa."
      />
    )
  }

  return <TenantLayout tenant={tenant} profile={profile} />
}

function PlatformApp() {
  const { session } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<PlatformProtectedShell />}>
        <Route path="/" element={<Navigate to="/tenants" replace />} />
        <Route path="/tenants" element={<TenantsListPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function PlatformProtectedShell() {
  const { session } = useAuth()
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile()
  const isSuperAdmin = profile?.role === 'super_admin'
  const { data: tenant } = useTenant(!isSuperAdmin ? profile?.tenant_id : undefined)

  const redirectUrl = profile && !isSuperAdmin && tenant ? tenantUrl(tenant.slug) : null
  useRedirectOnce(redirectUrl)

  if (!session) return <Navigate to="/login" replace />
  if (profileLoading) return <FullscreenSpinner />
  if (profileError || !profile) {
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
  if (!isSuperAdmin) return <FullscreenSpinner />

  return <PlatformLayout profile={profile} />
}
