import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import type { Tenant } from '@/features/tenants/api'

/** Rodapé institucional da Premium — substitui o `AppFooter` fixo e estreito
 * do dashboard (não usado nessa variante) por um rodapé maior, em fluxo
 * normal de página, com colunas de contato e navegação. */
export function PremiumFooter({ tenant }: { tenant: Tenant }) {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold">{tenant.name}</span>
          <p className="text-muted-foreground text-sm">Conectando imóveis, corretores e oportunidades.</p>
          {tenant.creci_juridico && (
            <span className="text-muted-foreground text-xs">CRECI-J {tenant.creci_juridico}</span>
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Contato</span>
          {tenant.phone && (
            <span className="text-muted-foreground flex items-center gap-2">
              <Phone className="size-4" /> {tenant.phone}
            </span>
          )}
          {tenant.email && (
            <span className="text-muted-foreground flex items-center gap-2">
              <Mail className="size-4" /> {tenant.email}
            </span>
          )}
          {tenant.address && (
            <span className="text-muted-foreground flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" /> {tenant.address}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Navegação</span>
          <Link to="/corretores" className="text-muted-foreground hover:text-foreground w-fit">
            Corretores
          </Link>
          <Link to="/login" className="text-muted-foreground hover:text-foreground w-fit">
            Área do corretor
          </Link>
        </div>
      </div>

      <div className="text-muted-foreground border-t px-6 py-4 text-center text-xs">
        © {new Date().getFullYear()} {tenant.name} — Conectando imóveis, corretores e oportunidades.
      </div>
    </footer>
  )
}
