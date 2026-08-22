# Continuidade — onde paramos

> Atualize este arquivo ao final de cada sessão de trabalho relevante. Objetivo: qualquer um
> (ou qualquer sessão nova do Claude) consegue retomar só lendo isto, sem precisar vasculhar
> o histórico da conversa.

## Última sessão — 2026-08-21

**O que foi feito:**
- Lido e mapeado o sistema Laravel anterior (repo `placehub`, branches até `release/1.1`) para
  entender o domínio de negócio e levantar pontos de melhoria.
- Decidido, com o usuário: reescrita completa em React + Vite + TypeScript + Tailwind + shadcn/ui,
  backend Supabase, deploy Vercel, e-mail via Resend. Sem migração de dados do sistema antigo
  (banco zerado). Multi-tenancy por subdomínio. Supabase Auth como base de autenticação.
  Login único (mesma tela para plataforma e tenants), com sessão via cookie de domínio raiz.
- Análise de arquitetura completa registrada em [ARCHITECTURE.md](./ARCHITECTURE.md).
- Scaffold do projeto criado em `c:\Desenv\VSCode\ProjetosReact\placehub`: Vite + React +
  TS + Tailwind v4 + shadcn/ui (preset Nova), tema claro/escuro testado (renderiza certo nos
  dois temas, sem erros de console — verificado via browser headless).
- Dependências instaladas: react-router-dom, @supabase/supabase-js, @tanstack/react-query,
  react-hook-form, zod, @hookform/resolvers, @tanstack/react-table, recharts, date-fns.
- `supabase/` inicializado (`supabase init`) com a migration inicial
  `20260822004432_init_platform_schema.sql` (tenants, profiles, permissions, RLS).
- `npm run build` e `npm run lint` passam limpos.

**Estado do git:** commit inicial enviado para `origin/trunk`
(`https://github.com/adenauerteixeira/placehub-react-viti.git`).

**Estado do Supabase:** projeto real criado pelo usuário (`placehub.plataforma's Project`).
`.env.local` preenchido com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave `sb_publishable_...`,
formato novo do Supabase). Migration inicial aplicada com sucesso via SQL Editor (colada
manualmente — CLI ainda não autenticado neste ambiente, ver nota abaixo).

**Bootstrap do super_admin:** resolvido. `handle_new_user()` tinha um bug que quebrava a
criação de qualquer usuário sem `tenant_id`/`role` em metadata (violava a constraint
`profiles_super_admin_has_no_tenant`) — corrigido em
`20260822014440_fix_handle_new_user_bootstrap.sql` (aplicada via SQL Editor, sucesso). Primeiro
`super_admin` criado: `root@gmail.com`, via Authentication → Add user no painel Supabase.

## Sessão seguinte — autenticação e console da plataforma (Fase 1, parte 1)

**O que foi feito:**
- Implementado e testado ponta a ponta (navegador headless, contra o Supabase real): login
  único, resolução de contexto por subdomínio, redirecionamento pós-login por role, console da
  plataforma com listagem de tenants (vazia — nenhum tenant cadastrado ainda).
- Arquivos-chave: `src/features/auth/*`, `src/app/app-shell.tsx`, `src/lib/subdomain.ts`,
  `src/lib/hostname.ts`, `src/lib/use-redirect-once.ts`, `src/features/platform/*`,
  `src/features/tenant/*`, `src/features/tenants/api.ts`.
- Três bugs reais encontrados e corrigidos durante o teste (detalhes no CHANGELOG): navegação
  cross-subdomínio chamada durante o render (StrictMode duplicava e cancelava a navegação);
  `AuthProvider` com `getSession()` e `onAuthStateChange` competindo pelo mesmo estado; cookie
  de sessão `Domain=.localhost` sendo rejeitado pelo Chrome ao ser setado a partir de um
  subdomínio (`localhost` é tratado como *public suffix* — só afeta dev local, produção não
  tem esse problema com um domínio real).
- `npm run build` e `npm run lint` seguem limpos.

**Estado do git:** commits desta etapa ainda não feitos — fazer commit + push (usuário já deu
permissão permanente para push neste repo, não precisa perguntar de novo) antes de seguir.

## Próximos passos imediatos

1. Commitar e dar push do trabalho de autenticação/plataforma.
2. Criar um tenant de teste (manualmente via SQL Editor, já que o CRUD de tenants ainda não
   existe) para poder testar o lado `TenantGate`/`TenantLayout`/`TenantDashboardPage`, que ainda
   não foi validado em navegador (só o lado plataforma foi).
3. Seguir a Fase 1: CRUD de tenants no console da plataforma — isso precisa de uma Edge Function
   com service role para criar o primeiro `tenant_admin` via Admin API (criar `auth.users` com
   metadata `{tenant_id, role: 'tenant_admin'}`). Vou precisar pedir ao usuário para criar o
   projeto/CLI do Supabase autenticado (ou aplicar a Edge Function manualmente) quando chegar
   nessa parte.

## Notas técnicas para retomar

- CLI do Supabase (`npx supabase`) ainda não está autenticado neste ambiente (`supabase login`
  pede fluxo interativo no navegador). Migrations futuras: ou o usuário gera um Personal Access
  Token (Account > Access Tokens) para eu usar `supabase link`/`db push`, ou continuamos colando
  SQL manualmente no SQL Editor — decidir quando a próxima migration estiver pronta.
- Testes locais de subdomínio: usar `http://app.localhost:5173` e `http://{slug}.localhost:5173`
  (Chrome resolve `*.localhost` para 127.0.0.1 nativamente, sem mexer no hosts file). O SSO
  *entre* subdomínios (cookie compartilhado) não é testável assim — ver ARCHITECTURE.md.
- Ao rodar QA com o skill `browser-automation` neste projeto: sempre reiniciar o dev server
  (matar processo na porta, subir de novo, esperar "assentar" uns 3s) antes de testar depois de
  editar arquivos — testar durante uma janela de HMR ativo produz `ERR_ABORTED` em cascata que
  não tem nada a ver com bugs reais do app.

## Decisões em aberto / para revisitar

- Nenhuma pendente no momento. Se surgir uma dúvida de arquitetura durante a Fase 1, registrar
  aqui antes de decidir sozinho.

## Notas úteis

- O clone de inspeção do sistema Laravel antigo está em
  `c:\Desenv\VSCode\ProjetosReact\placehub_temp` (fora do repo novo, só para consulta pontual
  ao domínio de negócio original; pode ser removido quando não for mais necessário).
