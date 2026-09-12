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
            <ThemeToggle className="!text-white hover:!bg-white/10" />
          </div>
        </>
      }
      style={{ backgroundColor: '#1c2421' }}
      headerClassName="!border-white/10 !bg-transparent !text-white !shadow-none"
      mainClassName="!top-0 !bottom-0"
      footer={<AppFooter className="!border-white/10 !bg-transparent !text-white/55">{tenant ? `${tenant.name} · Plataforma PlaceHub` : 'PlaceHub'}</AppFooter>}
    >
      <section className="relative flex min-h-full w-full items-center overflow-hidden bg-[linear-gradient(135deg,#26312d_0%,#1c2421_52%,#202a27_100%)] px-5 py-24 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_45%,color-mix(in_oklab,var(--primary)_34%,transparent),transparent_42%),radial-gradient(ellipse_at_84%_14%,color-mix(in_oklab,var(--accent)_24%,transparent),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(115deg,transparent_25%,rgba(255,255,255,0.06)_25.1%,transparent_25.3%,transparent_57%,rgba(255,255,255,0.035)_57.1%,transparent_57.3%)] [background-size:44rem_44rem]" />
        <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_minmax(22rem,26rem)]">
          <div className="hidden max-w-lg flex-col lg:flex">
              <div className="mb-7 flex size-14 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white/90 shadow-2xl shadow-black/20">
              <Building2 className="size-7" aria-hidden="true" />
            </div>
            <p className="mb-3 text-xs font-bold tracking-[0.18em] text-primary-foreground/70 uppercase">{contextLabel}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">{contextTitle}</h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">{contextDescription}</p>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-white/65">
              {['Acesso protegido para sua equipe', 'Informações organizadas em um só lugar'].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="flex size-5 items-center justify-center rounded-full bg-white/10 text-primary-foreground">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-[26rem] lg:mx-0">
            <div className="mb-7 flex flex-col lg:hidden">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-white/90 shadow-xl shadow-black/20">
                <Building2 className="size-5" aria-hidden="true" />
              </div>
              <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-primary-foreground/70 uppercase">{contextLabel}</p>
              <h1 className="text-2xl leading-tight font-semibold tracking-tight text-white">{contextTitle}</h1>
            </div>
            {card}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
