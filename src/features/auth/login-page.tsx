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
import { useTheme } from '@/lib/theme-provider'
import { supabase } from '@/lib/supabase'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import { usePublicTenant } from '@/features/tenants/api'

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

  return (
    <AppShell
      centerMain
      header={
        <>
          {tenant ? (
            <TenantBrand tenant={tenant} dark={dark} />
          ) : (
            <span className="text-lg font-semibold">PlaceHub</span>
          )}
          <div className="flex items-center gap-2">
            {tenantSlug && (
              <Button asChild variant="ghost">
                <Link to="/">Anúncios</Link>
              </Button>
            )}
            <ThemeToggle />
          </div>
        </>
      }
      footer={<AppFooter>{tenant ? `${tenant.name} · Plataforma PlaceHub` : 'Plataforma PlaceHub'}</AppFooter>}
    >
      <Card className="mx-auto w-full max-w-sm">
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
    </AppShell>
  )
}
