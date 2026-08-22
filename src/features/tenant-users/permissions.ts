// Espelha o catálogo semeado em public.permissions (migration
// 20260822004432_init_platform_schema.sql). Buscar do banco seria mais
// "correto", mas o catálogo é fixo e definido em migration — manter aqui
// evita uma query extra só pra montar uma lista de checkboxes.
export const PERMISSION_MODULES: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Painel' },
  { key: 'announcements', label: 'Anúncios' },
  { key: 'developments', label: 'Empreendimentos' },
  { key: 'partners', label: 'Parceiros' },
  { key: 'brokers', label: 'Corretores' },
  { key: 'leads', label: 'Leads' },
  { key: 'negotiations', label: 'Negociações' },
  { key: 'proposals', label: 'Propostas' },
  { key: 'reservations', label: 'Reservas' },
  { key: 'sales', label: 'Vendas' },
  { key: 'commissions', label: 'Comissões' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'users', label: 'Usuários' },
  { key: 'branding', label: 'Identidade visual' },
]

export const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Administrador',
  manager: 'Gerente',
  broker: 'Corretor',
}

export const ASSIGNABLE_ROLES = ['tenant_admin', 'manager', 'broker'] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]
