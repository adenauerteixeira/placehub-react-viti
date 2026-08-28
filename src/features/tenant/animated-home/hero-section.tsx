import type { RefObject } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, useTransform, type MotionValue } from 'motion/react'
import { brandingAssetUrl } from '@/features/tenant-branding/api'
import { useTenantLogo } from '@/features/tenant-branding/tenant-brand'
import type { Tenant } from '@/features/tenants/api'

/** Hero em tela cheia — nome/logo centralizados, indicador de rolar pra
 * baixo. Some (opacidade/escala) conforme o usuário rola, via scrollYProgress
 * compartilhado com o CollapsingHeader (ver use-hero-collapse.ts). */
export function HeroSection({
  tenant,
  dark,
  heroRef,
  scrollYProgress,
}: {
  tenant: Tenant
  dark: boolean
  heroRef: RefObject<HTMLElement | null>
  scrollYProgress: MotionValue<number>
}) {
  const { logoUrl } = useTenantLogo(tenant, dark)
  // Imagem dedicada do hero animado — independente do "Plano de fundo" da
  // home clássica (Identidade Visual > Página pública > "Hero da home
  // animada"). Só entra em jogo se "Mostrar uma imagem de fundo" estiver
  // marcado. As partículas (ParticlesBackground) não são mais renderizadas
  // aqui — viraram um fundo fixo de página inteira em AnimatedTenantHomePage,
  // visível também atrás do hero sempre que a seção não tiver imagem própria
  // cobrindo tudo (as duas opções são independentes e podem estar ligadas
  // juntas: a imagem simplesmente fica por cima).
  const showImage = tenant.animated_hero_show_image
  const backgroundUrl = showImage
    ? brandingAssetUrl(tenant.animated_hero_image_path, tenant.updated_at)
    : null
  const showParticles = tenant.animated_hero_show_particles

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92])

  return (
    <section
      ref={heroRef}
      className="relative flex h-dvh flex-col items-center justify-center overflow-hidden text-white"
      style={
        !backgroundUrl && !showParticles
          ? { background: 'linear-gradient(135deg, var(--primary), var(--accent))' }
          : undefined
      }
    >
      {backgroundUrl && (
        <>
          <img src={backgroundUrl} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}

      <motion.div
        style={{ opacity, scale }}
        className="relative flex flex-col items-center gap-6 px-6 text-center"
      >
        {logoUrl && (
          <img src={logoUrl} alt={tenant.name} className="h-20 w-auto drop-shadow-lg sm:h-28" />
        )}
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{tenant.name}</h1>
        <p className="max-w-xl text-white/90 sm:text-lg">
          Encontre seu próximo imóvel com quem entende do mercado!
        </p>
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="motion-safe:animate-bounce absolute bottom-10 flex flex-col items-center gap-1 text-white/80"
      >
        <span className="text-xs tracking-wide uppercase">Role para explorar</span>
        <ChevronDown className="size-6" />
      </motion.div>
    </section>
  )
}
