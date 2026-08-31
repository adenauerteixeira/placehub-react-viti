import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppFooter, AppShell } from '@/components/app-shell'
import { PlatformPageLabel } from '@/components/platform-page-label'
import { useTheme } from '@/lib/theme-provider'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { usePublicTenant } from '@/features/tenants/api'
import {
  usePlatformBackgroundBorder,
  usePlatformBackgroundUrl,
  usePlatformLogoUrl,
} from '@/features/platform-branding/use-platform-brand-assets'

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
  const heroImageUrl = usePlatformBackgroundUrl(dark)
  const heroBorder = usePlatformBackgroundBorder(dark)

  const card = (
    <Card
      className={cn(
        'mx-auto w-full max-w-sm',
        !tenantSlug &&
          'border-white/40 bg-white/40 shadow-2xl ring-1 ring-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-black/40 dark:ring-white/10',
      )}
    >
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        {!tenantSlug && (
          <CardDescription>Área restrita da administração da plataforma PlaceHub.</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>
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
            {!tenantSlug && <PlatformPageLabel page="Login" />}
            <ThemeToggle />
          </div>
        </>
      }
      footer={<AppFooter>{tenant ? `${tenant.name} · Plataforma PlaceHub` : 'Plataforma PlaceHub'}</AppFooter>}
    >
      {tenantSlug ? (
        card
      ) : (
        <div
          className={cn(
            'relative flex min-h-[28rem] w-full items-center justify-center overflow-hidden rounded-2xl sm:min-h-[32rem]',
            (!heroImageUrl || heroBorder) && 'border',
          )}
        >
          {heroImageUrl ? (
            <img src={heroImageUrl} alt="" className="absolute inset-0 size-full object-contain" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
            />
          )}
          <div className="relative z-10 px-4">{card}</div>
        </div>
      )}
    </AppShell>
  )
}
