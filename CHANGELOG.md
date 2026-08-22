# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas no
formato AAAA-MM-DD.

## [Não lançado]

### Alterado

- Toggle de tema simplificado: alterna direto entre claro/escuro num clique (era um menu com
  Claro/Escuro/Sistema).
- Tema visual trocado do preset neutro "Nova" do shadcn para uma direção própria ("Dashboard
  SaaS colorido" — decidida comparando 3 opções num canvas de design). Fonte Geist → Plus
  Jakarta Sans, `--radius` maior (cantos mais arredondados), cores de categoria
  (azul/verde/âmbar/violeta) nos tokens `--chart-1`..`--chart-4` para reaproveitar no dashboard
  real (Fase 4). Detalhes em ARCHITECTURE.md.

### Adicionado

- Edge Function `create-tenant-admin` (`supabase/functions/create-tenant-admin/index.ts`):
  cria o `tenant_admin` de um tenant via Admin API (`auth.admin.createUser` com
  `user_metadata.tenant_id`/`role`, que o trigger `handle_new_user` já sabe interpretar).
  Verifica dentro da própria função que quem chama é `super_admin` (não confia no client).
  Substitui o fluxo manual de SQL colado — `LinkAdminDialog` agora chama a função direto.
- CRUD de tenants no console da plataforma: criar (`TenantFormDialog`, com slug auto-gerado do
  nome e validado contra a mesma regra do banco), editar (nome/e-mail/telefone; subdomínio é
  fixo após criado), ativar/desativar (`Switch` na listagem). Tudo direto no client, sem
  necessidade de Edge Function — protegido pelas policies `tenants_insert`/`tenants_update`
  (super_admin only) já existentes.
- Diálogo "Vincular administrador" (`link-admin-dialog.tsx`): gera o SQL para ligar um usuário
  (criado manualmente no painel do Supabase) a um tenant como `tenant_admin` — solução ponte
  até existir a Edge Function de criação de usuário via Admin API. Abre automaticamente depois
  de criar um tenant.
- Testado ponta a ponta em navegador headless: criar tenant → aparece na lista → editar →
  desativar/ativar → abrir diálogo de vínculo com o SQL correto.
- Scaffold do projeto: Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui (preset Nova),
  tema claro/escuro com `ThemeProvider` próprio.
- Cliente Supabase (`src/lib/supabase.ts`) com sessão persistida em cookie de domínio raiz
  (`src/lib/cookie-storage.ts`), para login único entre subdomínios.
- Migration inicial do banco (`tenants`, `profiles`, `permissions`, `profile_permissions`),
  com Row Level Security e funções auxiliares (`current_tenant_id`, `is_super_admin`,
  `is_tenant_admin`) e triggers de proteção (`guard_profile_privilege_change`,
  `guard_tenant_sensitive_change`).
- Documentação: README, ROADMAP, ARCHITECTURE, CONTINUITY.
- Projeto Supabase real criado; migration inicial aplicada com sucesso via SQL Editor.
- Push do commit inicial para `https://github.com/adenauerteixeira/placehub-react-viti.git`
  (branch `trunk`).
- Primeiro usuário `super_admin` da plataforma criado (bootstrap).
- Autenticação: `AuthProvider` (`src/features/auth/auth-context.tsx`), tela de login única
  (`login-page.tsx`) com react-hook-form + zod.
- Resolução de contexto por subdomínio (`src/lib/subdomain.ts`, `src/lib/hostname.ts`) e
  redirecionamento pós-login por role/tenant (`src/app/app-shell.tsx`).
- Console da plataforma: layout (`platform-layout.tsx`) e listagem de tenants
  (`tenants-list-page.tsx`), somente leitura por enquanto.
- Layout e dashboard placeholder do tenant (`tenant-layout.tsx`, `tenant-dashboard-page.tsx`).
- Testado ponta a ponta em navegador headless: login em `app.localhost`, perfil carregado,
  redirecionamento para `/tenants`, RLS respeitada (super_admin vê a lista vazia sem erro).
- Home do tenant pública (`public-home-page.tsx`, placeholder "anúncios em breve" — catálogo
  real é Fase 2), com botão "Entrar" para `/login`. Login deixou de ser o gate de todo o app:
  agora é uma rota própria; rotas protegidas redirecionam para `/login` quando não há sessão,
  em vez da aplicação inteira virar uma tela de login (correção pedida pelo usuário, alinhando
  com o comportamento do sistema anterior: `tenant.home` sempre foi público).
- Policy `tenants_select_public` (migration `20260822114717_add_public_tenant_read.sql`):
  leitura pública de tenants ativos, necessária pra home pública resolver o tenant pelo slug do
  subdomínio antes do login.
- Primeiro tenant real criado: **Casah** (slug `casah`), com o primeiro `tenant_admin`
  (`tenant.adm@gmail.com`). Testado ponta a ponta: home pública → `/login` → `/dashboard`,
  `TenantProtectedShell` resolvendo tenant/role corretamente, papel `tenant_admin` exibido.

### Corrigido

- `handle_new_user()` quebrava a criação de qualquer usuário sem `tenant_id`/`role` em
  `raw_user_meta_data` (violava `profiles_super_admin_has_no_tenant`) — impedia inclusive o
  bootstrap do primeiro `super_admin`. Corrigido em
  `20260822014440_fix_handle_new_user_bootstrap.sql`: sem nenhum `super_admin` existente, um
  usuário sem metadata nasce como `super_admin`; essa janela se fecha sozinha depois.
- Navegação entre subdomínios (`window.location.replace`) sendo chamada durante o *render* em
  vez de em `useEffect` — o StrictMode do React a disparava duas vezes em sequência, cancelando
  uma navegação com a outra (`ERR_ABORTED`). Corrigido com `src/lib/use-redirect-once.ts`.
- `AuthProvider` chamava `getSession()` e `onAuthStateChange` em paralelo, cada um atualizando
  o mesmo estado — com o storage assíncrono baseado em cookie, `getSession()` podia resolver
  *depois* de um login recém-feito e sobrescrever a sessão válida. Corrigido usando só
  `onAuthStateChange` (que já dispara com a sessão atual ao inscrever).
- Cookie de sessão com `Domain=.localhost`: o Chrome trata `localhost` como *public suffix* e
  rejeita silenciosamente esse cookie quando setado a partir de um subdomínio (`app.localhost`),
  quebrando a autenticação em dev local. `cookie-storage.ts` agora usa cookie host-only quando
  o domínio raiz é `localhost`; em produção (domínio real) o comportamento não muda.
- `handle_new_user()` também quebrava ao criar um usuário pelo painel do Supabase (Add user)
  depois que o primeiro `super_admin` já existia, porque o painel não expõe um campo de
  `user_metadata` — a trigger exigia `role`/`tenant_id` e revertia a criação inteira do usuário
  sem eles. Corrigido em `20260822120251_allow_manual_profile_creation.sql`: sem metadata e já
  havendo um `super_admin`, a trigger não cria o profile (em vez de dar erro) — o profile é
  inserido manualmente depois via SQL, até existir a Edge Function de criação de usuário.

