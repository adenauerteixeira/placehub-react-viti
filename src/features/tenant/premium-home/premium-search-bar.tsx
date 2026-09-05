import { Heart, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import type { PropertyType, TransactionType } from '@/features/announcements/api'
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPE_ORDER, TRANSACTION_TYPE_LABELS } from '@/features/announcements/labels'

export type PremiumSortBy = 'relevance' | 'price_asc' | 'price_desc'

export const SORT_LABELS: Record<PremiumSortBy, string> = {
  relevance: 'Mais relevantes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
}

export type PremiumFilters = {
  transactionType: TransactionType | 'all'
  propertyType: PropertyType | 'all'
  city: string
  /** null = sem filtro de preço ativo (usa priceBounds inteiro) */
  priceRange: [number, number] | null
  sortBy: PremiumSortBy
  onlyFavorites: boolean
}

export const DEFAULT_PREMIUM_FILTERS: PremiumFilters = {
  transactionType: 'all',
  propertyType: 'all',
  city: 'all',
  priceRange: null,
  sortBy: 'relevance',
  onlyFavorites: false,
}

export function isPremiumFiltersActive(filters: PremiumFilters): boolean {
  return (
    filters.transactionType !== 'all' ||
    filters.propertyType !== 'all' ||
    filters.city !== 'all' ||
    filters.priceRange != null ||
    filters.sortBy !== 'relevance' ||
    filters.onlyFavorites
  )
}

function formatFullPrice(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function FilterFields({
  filters,
  onChange,
  cities,
  priceBounds,
}: {
  filters: PremiumFilters
  onChange: (next: PremiumFilters) => void
  cities: string[]
  priceBounds: [number, number]
}) {
  const range = filters.priceRange ?? priceBounds
  const step = Math.max(1, Math.round((priceBounds[1] - priceBounds[0]) / 100))

  return (
    <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
      <div className="flex flex-1 flex-col gap-1.5 sm:min-w-32">
        <label className="text-muted-foreground text-xs font-medium">Finalidade</label>
        <Select
          value={filters.transactionType}
          onValueChange={(v) => onChange({ ...filters, transactionType: v as PremiumFilters['transactionType'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 sm:min-w-36">
        <label className="text-muted-foreground text-xs font-medium">Tipo de imóvel</label>
        <Select
          value={filters.propertyType}
          onValueChange={(v) => onChange({ ...filters, propertyType: v as PremiumFilters['propertyType'] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {PROPERTY_TYPE_ORDER.map((type) => (
              <SelectItem key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 sm:min-w-36">
        <label className="text-muted-foreground text-xs font-medium">Cidade</label>
        <Select value={filters.city} onValueChange={(v) => onChange({ ...filters, city: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-[2] flex-col gap-1.5 sm:min-w-64">
        <label className="text-muted-foreground flex flex-col text-xs font-medium">
          <span>Faixa de preço:</span>
          <span className="text-[11px] font-normal">
            {formatFullPrice(range[0])} – {formatFullPrice(range[1])}
          </span>
        </label>
        <Slider
          className="py-1.5"
          min={priceBounds[0]}
          max={priceBounds[1]}
          step={step}
          value={range}
          onValueChange={(v) => onChange({ ...filters, priceRange: [v[0], v[1]] })}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 sm:min-w-36">
        <label className="text-muted-foreground text-xs font-medium">Ordenar por</label>
        <Select value={filters.sortBy} onValueChange={(v) => onChange({ ...filters, sortBy: v as PremiumSortBy })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/** Barra de busca flutuante do hero da Vitrine Premium — filtro 100%
 * client-side sobre os anúncios já carregados (sem query nova). Em telas
 * pequenas os mesmos campos abrem num Sheet, porque a linha inteira não cabe
 * lado a lado. */
export function PremiumSearchBar({
  filters,
  onChange,
  cities,
  priceBounds,
  resultCount,
  favoritesCount,
}: {
  filters: PremiumFilters
  onChange: (next: PremiumFilters) => void
  cities: string[]
  priceBounds: [number, number]
  resultCount: number
  favoritesCount: number
}) {
  const isFiltered = isPremiumFiltersActive(filters)

  const favoritesToggle = favoritesCount > 0 && (
    <Button
      type="button"
      variant={filters.onlyFavorites ? 'default' : 'outline'}
      size="sm"
      onClick={() => onChange({ ...filters, onlyFavorites: !filters.onlyFavorites })}
      className="gap-1.5"
    >
      <Heart className={cn('size-4', filters.onlyFavorites && 'fill-current')} />
      Favoritos ({favoritesCount})
    </Button>
  )

  return (
    <div className="bg-card ring-border relative z-10 flex flex-col gap-3 rounded-2xl p-4 shadow-xl ring-1 sm:flex-row sm:items-end sm:gap-4 sm:p-5">
      <div className="hidden flex-1 sm:flex sm:items-end sm:gap-3">
        <FilterFields filters={filters} onChange={onChange} cities={cities} priceBounds={priceBounds} />
      </div>

      <div className="flex items-center justify-between gap-3 sm:hidden">
        <span className="text-muted-foreground text-sm">
          {resultCount} {resultCount === 1 ? 'imóvel' : 'imóveis'}
        </span>
        <div className="flex items-center gap-2">
          {favoritesToggle}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="size-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtrar imóveis</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 p-4 pt-0">
                <FilterFields filters={filters} onChange={onChange} cities={cities} priceBounds={priceBounds} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-3 sm:flex">{favoritesToggle}</div>

      {isFiltered && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(DEFAULT_PREMIUM_FILTERS)}
          className="ring-border absolute -top-3 right-4 hidden shadow-md ring-1 sm:inline-flex"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
