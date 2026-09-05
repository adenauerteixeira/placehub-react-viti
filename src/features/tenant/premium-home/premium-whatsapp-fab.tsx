import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@/lib/whatsapp'
import type { Tenant } from '@/features/tenants/api'

/** Botão flutuante sempre visível (não depende de nenhum toggle de hero) —
 * some sozinho se o tenant não tem telefone cadastrado. O anel pulsante usa
 * `motion-safe:`, variante nativa do Tailwind que já desliga sozinha com
 * `prefers-reduced-motion: reduce`. */
export function PremiumWhatsappFab({ tenant }: { tenant: Tenant }) {
  if (!tenant.phone) return null

  return (
    <a
      href={whatsappUrl(tenant.phone, `Olá! Vim pelo site da ${tenant.name}.`)}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center"
    >
      <span className="motion-safe:animate-ping absolute inset-0 rounded-full bg-[#25D366] opacity-60" />
      <span className="relative flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105">
        <MessageCircle className="size-6" />
      </span>
    </a>
  )
}
