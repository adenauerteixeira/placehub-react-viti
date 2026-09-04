import { Link } from 'react-router-dom'
import { motion, useTransform, type MotionValue } from 'motion/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { TenantBrand } from '@/features/tenant-branding/tenant-brand'
import type { Tenant } from '@/features/tenants/api'

/** Cabeçalho compacto que o hero "vira" ao rolar. `position: fixed` (não
 * sticky) de propósito: como ele fica logo abaixo do hero (h-dvh) no fluxo
 * normal, um `position: sticky` só apareceria no viewport exatamente quando
 * já tivesse colado no topo — não daria pra ver o crossfade acontecendo. Fixo
 * + opacidade/y interpolados por scrollYProgress dá o efeito de "assentar
 * suavemente" enquanto o hero ainda está saindo de cena, e continua fixo
 * (opaco) pelo resto da rolagem — só volta a ficar invisível/não-clicável se
 * o usuário rolar de volta pro topo. */
export function CollapsingHeader({
  tenant,
  dark,
  scrollYProgress,
}: {
  tenant: Tenant
  dark: boolean
  scrollYProgress: MotionValue<number>
}) {
  const opacity = useTransform(scrollYProgress, [0.6, 1], [0, 1])
  const y = useTransform(scrollYProgress, [0.6, 1], [-12, 0])
  const pointerEvents = useTransform(opacity, (value) => (value > 0.05 ? 'auto' : 'none'))

  return (
    <motion.header
      style={{ opacity, y, pointerEvents }}
      className="bg-background/70 border-border fixed inset-x-0 top-0 z-30 border-b backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
        <TenantBrand tenant={tenant} dark={dark} showInstitutional />
        <div className="flex items-center gap-4">
          <Link to="/corretores" className="text-muted-foreground hover:text-foreground text-sm">
            Corretores
          </Link>
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
