import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FullscreenMessage, FullscreenSpinner } from '@/components/fullscreen-state'
import { NotFoundPage } from '@/components/not-found-page'
import { useAuth } from '@/features/auth/auth-context'
import { hasPermission, useProfile } from '@/features/auth/use-profile'
import { usePlatformFavicon } from '@/features/platform-branding/use-platform-favicon'
import { usePlatformSettings } from '@/features/platform-branding/api'
import { PlatformLayout } from '@/features/platform/platform-layout'
import { MaintenanceOverlay } from '@/features/tenant/maintenance-overlay'
import { TenantLayout, useTenantOutletContext } from '@/features/tenant/tenant-layout'
import { useTenant, usePublicTenant, usePublicTenantByDomain } from '@/features/tenants/api'
import { platformUrl, resolveSubdomainContext, tenantUrl } from '@/lib/subdomain'
import { useRedirectOnce } from '@/lib/use-redirect-once'

// Páginas só são baixadas quando a rota realmente precisa delas. Isso evita
// que um visitante do portal público carregue administração, relatórios e
// bibliotecas pesadas como Recharts/GSAP logo na primeira visita.
const LoginPage = lazy(async () => ({ default: (await import('@/features/auth/login-page')).LoginPage }))
const AnnouncementFormPage = lazy(async () => ({ default: (await import('@/features/announcements/announcement-form-page')).AnnouncementFormPage }))
const AnnouncementsListPage = lazy(async () => ({ default: (await import('@/features/announcements/announcements-list-page')).AnnouncementsListPage }))
const BrokersListPage = lazy(async () => ({ default: (await import('@/features/brokers/brokers-list-page')).BrokersListPage }))
const ChangelogPage = lazy(async () => ({ default: (await import('@/features/changelog/changelog-page')).ChangelogPage }))
const DevelopmentsListPage = lazy(async () => ({ default: (await import('@/features/developments/developments-list-page')).DevelopmentsListPage }))
const CommissionDetailPage = lazy(async () => ({ default: (await import('@/features/commissions/commission-detail-page')).CommissionDetailPage }))
const CommissionsListPage = lazy(async () => ({ default: (await import('@/features/commissions/commissions-list-page')).CommissionsListPage }))
const LeadDetailPage = lazy(async () => ({ default: (await import('@/features/leads/lead-detail-page')).LeadDetailPage }))
const LeadsListPage = lazy(async () => ({ default: (await import('@/features/leads/leads-list-page')).LeadsListPage }))
const NegotiationDetailPage = lazy(async () => ({ default: (await import('@/features/negotiations/negotiation-detail-page')).NegotiationDetailPage }))
const NegotiationsListPage = lazy(async () => ({ default: (await import('@/features/negotiations/negotiations-list-page')).NegotiationsListPage }))
const OwnersListPage = lazy(async () => ({ default: (await import('@/features/owners/owners-list-page')).OwnersListPage }))
const ReservationsListPage = lazy(async () => ({ default: (await import('@/features/reservations/reservations-list-page')).ReservationsListPage }))
const SaleDetailPage = lazy(async () => ({ default: (await import('@/features/sales/sale-detail-page')).SaleDetailPage }))
const SalesListPage = lazy(async () => ({ default: (await import('@/features/sales/sales-list-page')).SalesListPage }))
const PartnersListPage = lazy(async () => ({ default: (await import('@/features/partners/partners-list-page')).PartnersListPage }))
const PlatformBrandingPage = lazy(async () => ({ default: (await import('@/features/platform-branding/platform-branding-page')).PlatformBrandingPage }))
const ReportsPage = lazy(async () => ({ default: (await import('@/features/reports/reports-page')).ReportsPage }))
const TenantsListPage = lazy(async () => ({ default: (await import('@/features/platform/tenants-list-page')).TenantsListPage }))
const PublicAnnouncementDetailPage = lazy(async () => ({ default: (await import('@/features/tenant/public-announcement-detail-page')).PublicAnnouncementDetailPage }))
const PublicBrokerDetailPage = lazy(async () => ({ default: (await import('@/features/tenant/public-broker-detail-page')).PublicBrokerDetailPage }))
const PublicBrokersListPage = lazy(async () => ({ default: (await import('@/features/tenant/public-brokers-list-page')).PublicBrokersListPage }))
const AnimatedTenantHomePage = lazy(async () => ({ default: (await import('@/features/tenant/animated-home/animated-home-page')).AnimatedTenantHomePage }))
const PublicTenantHomePage = lazy(async () => ({ default: (await import('@/features/tenant/public-home-page')).PublicTenantHomePage }))
const ShowcaseTenantHomePage = lazy(async () => ({ default: (await import('@/features/tenant/showcase-home/showcase-home-page')).ShowcaseTenantHomePage }))
const PremiumTenantHomePage = lazy(async () => ({ default: (await import('@/features/tenant/premium-home/premium-home-page')).PremiumTenantHomePage }))
const PremiumAnnouncementDetailPage = lazy(async () => ({ default: (await import('@/features/tenant/premium-home/premium-announcement-detail-page')).PremiumAnnouncementDetailPage }))
const PremiumBrokersListPage = lazy(async () => ({ default: (await import('@/features/tenant/premium-home/premium-brokers-list-page')).PremiumBrokersListPage }))
const PremiumBrokerDetailPage = lazy(async () => ({ default: (await import('@/features/tenant/premium-home/premium-broker-detail-page')).PremiumBrokerDetailPage }))
const TenantDashboardPage = lazy(async () => ({ default: (await import('@/features/tenant/tenant-dashboard-page')).TenantDashboardPage }))
const TrainingPage = lazy(async () => ({ default: (await import('@/features/tenant/training-page')).TrainingPage }))
const BackupPage = lazy(async () => ({ default: (await import('@/features/tenant/backup-page')).BackupPage }))
const ResetDataPage = lazy(async () => ({ default: (await import('@/features/tenant/reset-data-page')).ResetDataPage }))
const TenantBrandingPage = lazy(async () => ({ default: (await import('@/features/tenant-branding/tenant-branding-page')).TenantBrandingPage }))
const TenantUsersPage = lazy(async () => ({ default: (await import('@/features/tenant-users/tenant-users-page')).TenantUsersPage }))

// A home de cada contexto é pública (portal de anúncios no tenant, nada no
// apex); login é uma rota própria (/login), não o "portão" do app inteiro —
// mesmo comportamento do sistema anterior (tenant.home público vs.
// plataforma/login). Ver ARCHITECTURE.md.
export function AppShell() {
  const { loading } = useAuth()
  if (loading) return <FullscreenSpinner />

  const context = resolveSubdomainContext()

  if (context.kind === 'tenant') return <TenantApp slug={context.slug} />
  if (context.kind === 'custom-domain') return <CustomDomainApp hostname={context.hostname} />
  if (context.kind === 'platform') return <PlatformApp />
  return <ApexRedirect />
}

function CustomDomainApp({ hostname }: { hostname: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenantByDomain(hostname)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Este domínio ainda não está vinculado a uma imobiliária ativa."
      />
    )
  }

  return <TenantApp slug={tenant.slug} />
}

function ApexRedirect() {
  useRedirectOnce(platformUrl())
  return <FullscreenSpinner />
}

function TenantApp({ slug }: { slug: string }) {
  const { session } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<TenantHomeRoute slug={slug} />} />
      <Route path="/anuncios/:slug" element={<TenantAnnouncementDetailRoute slug={slug} />} />
      <Route path="/corretores" element={<TenantBrokersListRoute slug={slug} />} />
      <Route path="/corretores/:slug" element={<TenantBrokerDetailRoute slug={slug} />} />
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" replace /> : <LoginPage tenantSlug={slug} />}
      />
      <Route element={<TenantProtectedShell slug={slug} />}>
        <Route path="/dashboard" element={<TenantDashboardPage />} />
        <Route
          path="/treinamento"
          element={
            <RequireTrainingEnabled>
              <TrainingPage />
            </RequireTrainingEnabled>
          }
        />
        <Route
          path="/users"
          element={
            <RequireTenantAdmin>
              <TenantUsersPage />
            </RequireTenantAdmin>
          }
        />
        <Route
          path="/backup"
          element={
            <RequireTenantAdmin>
              <BackupPage />
            </RequireTenantAdmin>
          }
        />
        <Route
          path="/resetar-dados"
          element={
            <RequireTenantAdmin>
              <ResetDataPage />
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
        <Route
          path="/changelog"
          element={
            <RequireTenantAdmin>
              <ChangelogPage />
            </RequireTenantAdmin>
          }
        />
        <Route
          path="/developments"
          element={
            <RequirePermission module="developments">
              <DevelopmentsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/partners"
          element={
            <RequirePermission module="partners">
              <PartnersListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/brokers"
          element={
            <RequirePermission module="brokers">
              <BrokersListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/owners"
          element={
            <RequirePermission module="owners">
              <OwnersListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/announcements"
          element={
            <RequirePermission module="announcements">
              <AnnouncementsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/announcements/:id"
          element={
            <RequirePermission module="announcements">
              <AnnouncementFormPage />
            </RequirePermission>
          }
        />
        <Route
          path="/leads"
          element={
            <RequirePermission module="leads">
              <LeadsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/leads/:id"
          element={
            <RequirePermission module="leads">
              <LeadDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="/negotiations"
          element={
            <RequirePermission module="negotiations">
              <NegotiationsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/negotiations/:id"
          element={
            <RequirePermission module="negotiations">
              <NegotiationDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="/reservations"
          element={
            <RequirePermission module="reservations">
              <ReservationsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/sales"
          element={
            <RequirePermission module="sales">
              <SalesListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/sales/:id"
          element={
            <RequirePermission module="sales">
              <SaleDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="/commissions"
          element={
            <RequirePermission module="commissions">
              <CommissionsListPage />
            </RequirePermission>
          }
        />
        <Route
          path="/commissions/:id"
          element={
            <RequirePermission module="commissions">
              <CommissionDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="/reports"
          element={
            <RequirePermission module="reports">
              <ReportsPage />
            </RequirePermission>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

// Escolhe entre a home pública clássica e a animada conforme
// `public_home_variant` — busca o tenant uma vez só aqui (mesma chave de
// query que PublicTenantHomePage usa internamente, o react-query deduplica).
function TenantHomeRoute({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Confira o endereço ou fale com quem te enviou o link."
      />
    )
  }

  if (tenant.public_home_variant === 'animated') return <AnimatedTenantHomePage tenant={tenant} />
  if (tenant.public_home_variant === 'showcase') return <ShowcaseTenantHomePage slug={slug} />
  if (tenant.public_home_variant === 'premium') return <PremiumTenantHomePage slug={slug} />
  return <PublicTenantHomePage slug={slug} />
}

// Mesma ideia de TenantHomeRoute, pras 3 rotas públicas compartilhadas por
// todas as variantes — só a Premium tem uma implementação própria (cabeçalho
// e cards diferentes); Clássica/Animada/Vitrine continuam na mesma página de
// sempre.
function TenantAnnouncementDetailRoute({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Confira o endereço ou fale com quem te enviou o link."
      />
    )
  }

  if (tenant.public_home_variant === 'premium') return <PremiumAnnouncementDetailPage tenantSlug={slug} />
  return <PublicAnnouncementDetailPage tenantSlug={slug} />
}

function TenantBrokersListRoute({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Confira o endereço ou fale com quem te enviou o link."
      />
    )
  }

  if (tenant.public_home_variant === 'premium') return <PremiumBrokersListPage tenantSlug={slug} />
  return <PublicBrokersListPage tenantSlug={slug} />
}

function TenantBrokerDetailRoute({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = usePublicTenant(slug)

  if (isLoading) return <FullscreenSpinner />
  if (isError || !tenant) {
    return (
      <FullscreenMessage
        title="Imobiliária não encontrada"
        description="Confira o endereço ou fale com quem te enviou o link."
      />
    )
  }

  if (tenant.public_home_variant === 'premium') return <PremiumBrokerDetailPage tenantSlug={slug} />
  return <PublicBrokerDetailPage tenantSlug={slug} />
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

function RequirePermission({
  module,
  children,
}: {
  module: string
  children: React.ReactNode
}) {
  const { profile } = useTenantOutletContext()
  if (!hasPermission(profile, module)) {
    return (
      <FullscreenMessage
        title="Sem permissão"
        description="Você não tem acesso a este módulo. Fale com o administrador da sua imobiliária."
      />
    )
  }
  return children
}

function RequireTrainingEnabled({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenantOutletContext()
  if (!tenant.training_enabled) {
    return (
      <FullscreenMessage
        title="Treinamento não disponível"
        description="O administrador da sua imobiliária ainda não habilitou a página de treinamento."
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

  return (
    <>
      <MaintenanceOverlay tenantId={tenant.id} />
      <TenantLayout tenant={tenant} profile={profile} />
    </>
  )
}

function PlatformApp() {
  const { session } = useAuth()
  const { data: settings } = usePlatformSettings()
  usePlatformFavicon(settings?.favicon_path ?? null, settings?.updated_at ?? '')

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<PlatformProtectedShell />}>
        <Route path="/" element={<Navigate to="/tenants" replace />} />
        <Route path="/tenants" element={<TenantsListPage />} />
        <Route path="/branding" element={<PlatformBrandingPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
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
