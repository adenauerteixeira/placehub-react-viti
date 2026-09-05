import type { BannerAd } from '@/features/tenant-banner-ads/api'
import type { Tenant } from '@/features/tenants/api'
import { BannerCarousel } from '../showcase-home/banner-carousel'
import { PremiumSearchBar, type PremiumFilters } from './premium-search-bar'

type SearchProps = {
  filters: PremiumFilters
  onFiltersChange: (next: PremiumFilters) => void
  cities: string[]
  priceBounds: [number, number]
  resultCount: number
  favoritesCount: number
}

/** Hero full-bleed da Vitrine Premium: reaproveita o BannerCarousel de
 * sempre (sem duplicar a lógica de loop/autoplay), forçando largura total e
 * desligando o modo "fixo ao rolar" — nessa variante o hero é sempre de
 * ponta a ponta e nunca gruda no topo, é o cabeçalho transparente que se
 * sobrepõe a ele, não o contrário. Sem nenhum slide configurado, cai num
 * gradiente com as cores do tenant (mesma lógica do PromoSlide sem foto) em
 * vez de sumir — a busca sempre precisa de algo pra flutuar por cima. Se o
 * banner estiver desligado nas configurações do tenant, a busca aparece
 * normal, sem sobrepor nada. */
export function PremiumHero({
  tenant,
  ads,
  heroEnabled,
  filters,
  onFiltersChange,
  cities,
  priceBounds,
  resultCount,
  favoritesCount,
}: SearchProps & {
  tenant: Tenant
  ads: BannerAd[]
  heroEnabled: boolean
}) {
  const searchBar = (
    <PremiumSearchBar
      filters={filters}
      onChange={onFiltersChange}
      cities={cities}
      priceBounds={priceBounds}
      resultCount={resultCount}
      favoritesCount={favoritesCount}
    />
  )

  if (!heroEnabled) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">{searchBar}</section>
    )
  }

  const hasSlides = tenant.public_hero_own_active || ads.length > 0
  const heroTenant: Tenant = { ...tenant, public_hero_full_width: true, public_hero_sticky: false }

  return (
    <section className="relative">
      {hasSlides ? (
        <BannerCarousel tenant={heroTenant} ads={ads} controlsAtBottom />
      ) : (
        <div
          className="relative flex min-h-64 w-full items-center justify-center sm:min-h-80"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
        >
          <div className="px-6 text-center text-white">
            <h1 className="text-2xl font-semibold sm:text-3xl">{tenant.name}</h1>
            <p className="mt-2 text-white/85">Encontre seu próximo imóvel com quem entende do mercado.</p>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto -mt-8 w-full max-w-5xl px-4 sm:-mt-10 sm:px-6">{searchBar}</div>
    </section>
  )
}
