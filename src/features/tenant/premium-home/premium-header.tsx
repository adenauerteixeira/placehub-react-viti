import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMotionValueEvent, useScroll } from 'motion/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import type { Tenant } from '@/features/tenants/api'

/** Cabeçalho da Vitrine Premium: quando há hero visual embaixo, nasce
 * transparente (sobrepondo a foto/gradiente) e só ganha fundo/blur depois de
 * ~48px de rolagem. As cores de texto nesse estado transparente vêm de
 * sobrescrever as MESMAS CSS vars que TenantBrand/Button já consomem
 * (--foreground, --muted-foreground, --border, --background) só nesse
 * contêiner — igual à técnica que o app já usa pra tema por tenant
 * (`tenantThemeVars`), só que escopada ao header em vez do tenant inteiro.
 * Sem hero (`transparentOverHero=false`), o header já nasce sólido. */
export function PremiumHeader({
  tenant,
  dark,
  transparentOverHero,
}: {
  tenant: Tenant
  dark: boolean
  transparentOverHero: boolean
}) {
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 48))

  const isTransparent = transparentOverHero && !scrolled

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 h-16 transition-colors duration-300',
        isTransparent
          ? '[--background:rgba(255,255,255,0.14)] [--border:rgba(255,255,255,0.35)] [--foreground:white] [--muted-foreground:rgba(255,255,255,0.78)]'
          : 'bg-background/85 border-b backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-6">
        <TenantBrand tenant={tenant} dark={dark} showInstitutional dimBackdrop={isTransparent} />
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:inline-block"
          >
            Anúncios
          </Link>
          <Link
            to="/corretores"
            className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:inline-block"
          >
            Corretores
          </Link>
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
