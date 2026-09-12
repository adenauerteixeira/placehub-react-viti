import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Building2, Check, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell } from '@/components/app-shell'
import { useTheme } from '@/lib/theme-provider'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { usePublicTenant } from '@/features/tenants/api'
import { usePlatformLogoUrl } from '@/features/platform-branding/use-platform-brand-assets'

const SLOGAN = 'Conecta pessoas à lugares. Realiza sonhos!'

const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage({ tenantSlug }: { tenantSlug?: string }) {
  const [submitting, setSubmitting] = useState(false)
  const { resolvedTheme } = useTheme()
  const { data: tenant } = usePublicTenant(tenantSlug ?? null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginForm) {
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword(values)
    setSubmitting(false)

    if (error) {
      toast.error('Não foi possível entrar', { description: error.message })
      return
    }
    // Sessão atualizada via onAuthStateChange — o app re-renderiza sozinho.
  }

  const dark = resolvedTheme === 'dark'
  const platformLogoUrl = usePlatformLogoUrl(dark)
  const isTenantLogin = !!tenantSlug
  const contextLabel = isTenantLogin ? 'Área exclusiva' : 'Console PlaceHub'
  const contextTitle = isTenantLogin
    ? `Gestão inteligente para a ${tenant?.name ?? 'sua imobiliária'}.`
    : 'Administre sua plataforma com clareza.'
  const contextDescription = isTenantLogin
    ? 'Acompanhe oportunidades, clientes e resultados em um ambiente seguro e feito para sua operação.'
    : 'Organize imobiliárias, identidades visuais e acessos em um só lugar.'
  const shellBackground = dark ? '#1c2421' : '#f4f8f6'
  const headerThemeClass = dark
    ? '!border-white/10 !bg-transparent !text-white !shadow-none'
    : '!border-border/60 !bg-background/78 !text-foreground !shadow-sm'
  const footerThemeClass = dark
    ? '!border-white/10 !bg-transparent !text-white/55'
    : '!border-border/60 !bg-background/78 !text-muted-foreground'
  const panelThemeClass = dark
    ? 'bg-[linear-gradient(135deg,#26312d_0%,#1c2421_52%,#202a27_100%)]'
    : 'bg-[linear-gradient(135deg,#edf6f1_0%,#f8fbf9_52%,#eef5f2_100%)]'
  const textureThemeClass = dark
    ? 'opacity-45 [background-image:linear-gradient(115deg,transparent_25%,rgba(255,255,255,0.06)_25.1%,transparent_25.3%,transparent_57%,rgba(255,255,255,0.035)_57.1%,transparent_57.3%)]'
    : 'opacity-35 [background-image:linear-gradient(115deg,transparent_25%,rgba(15,23,42,0.05)_25.1%,transparent_25.3%,transparent_57%,rgba(15,23,42,0.03)_57.1%,transparent_57.3%)]'
  const contextTextClass = dark ? 'text-white' : 'text-foreground'
  const contextMutedClass = dark ? 'text-white/65' : 'text-muted-foreground'
  const contextIconClass = dark
    ? 'border-white/12 bg-white/8 text-white/90 shadow-2xl shadow-black/20'
    : 'border-primary/15 bg-white/75 text-primary shadow-xl shadow-primary/8'
  const contextCheckClass = dark ? 'bg-white/10 text-white/90' : 'bg-primary/10 text-primary'

  const card = (
    <Card
      className={cn(
        'w-full max-w-[26rem] border-white/70 bg-white/95 text-slate-950 shadow-[0_24px_70px_-28px_rgb(0_0_0_/_0.72)] backdrop-blur-xl',
      )}
    >
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <CardTitle className="text-xl">{isTenantLogin ? 'Acesse sua conta' : 'Entrar no PlaceHub'}</CardTitle>
        <CardDescription>Use suas credenciais para entrar na área de gestão.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="E-mail" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field label="Senha" htmlFor="password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
          </Field>
          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting && <Loader2 className="animate-spin" />}
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )

  return (
    <AppShell
      centerMain
      header={
        <>
          {tenant ? (
            <TenantBrand tenant={tenant} dark={dark} />
          ) : (
            <div className="flex items-center gap-2">
              {platformLogoUrl && (
                <img src={platformLogoUrl} alt="PlaceHub" className="h-8 max-w-36 object-contain" />
              )}
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold">PlaceHub</span>
                <span className="text-muted-foreground hidden text-xs sm:block">{SLOGAN}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4">
            {tenantSlug && (
              <Button asChild variant="ghost">
                <Link to="/">Anúncios</Link>
              </Button>
            )}
            <ThemeToggle className={dark ? '!text-white hover:!bg-white/10' : '!text-foreground hover:!bg-black/5'} />
          </div>
        </>
      }
      style={{ backgroundColor: shellBackground }}
      headerClassName={headerThemeClass}
      mainClassName="!top-0 !bottom-0"
      footer={<AppFooter className={footerThemeClass}>{tenant ? `${tenant.name} · Plataforma PlaceHub` : 'PlaceHub'}</AppFooter>}
    >
      <section className={cn('relative flex min-h-full w-full items-center overflow-hidden px-5 py-24 sm:px-10 lg:px-14', panelThemeClass)}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_45%,color-mix(in_oklab,var(--primary)_34%,transparent),transparent_42%),radial-gradient(ellipse_at_84%_14%,color-mix(in_oklab,var(--accent)_24%,transparent),transparent_36%)]" />
        <div className={cn('pointer-events-none absolute inset-0 [background-size:44rem_44rem]', textureThemeClass)} />
        <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_minmax(22rem,26rem)]">
          <div className="hidden max-w-lg flex-col lg:flex">
              <div className={cn('mb-7 flex size-14 items-center justify-center rounded-2xl border', contextIconClass)}>
              <Building2 className="size-7" aria-hidden="true" />
            </div>
            <p className="text-primary mb-3 text-xs font-bold tracking-[0.18em] uppercase">{contextLabel}</p>
            <h1 className={cn('text-4xl font-semibold tracking-tight', contextTextClass)}>{contextTitle}</h1>
            <p className={cn('mt-5 max-w-md text-base leading-relaxed', contextMutedClass)}>{contextDescription}</p>
            <ul className={cn('mt-8 flex flex-col gap-3 text-sm', contextMutedClass)}>
              {['Acesso protegido para sua equipe', 'Informações organizadas em um só lugar'].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className={cn('flex size-5 items-center justify-center rounded-full', contextCheckClass)}>
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-[26rem] lg:mx-0">
            <div className="mb-7 flex flex-col lg:hidden">
              <div className={cn('mb-4 flex size-10 items-center justify-center rounded-xl border', contextIconClass)}>
                <Building2 className="size-5" aria-hidden="true" />
              </div>
              <p className="text-primary mb-2 text-[10px] font-bold tracking-[0.18em] uppercase">{contextLabel}</p>
              <h1 className={cn('text-2xl leading-tight font-semibold tracking-tight', contextTextClass)}>{contextTitle}</h1>
            </div>
            {card}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
