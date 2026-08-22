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

## Próximos passos imediatos

1. Commitar e (com confirmação do usuário) dar push da migration de correção.
2. Iniciar a Fase 1 do [ROADMAP.md](./ROADMAP.md): login único, resolução de tenant por
   subdomínio, console da plataforma (agora já dá para logar como super_admin para testar).

## Notas técnicas para retomar

- CLI do Supabase (`npx supabase`) ainda não está autenticado neste ambiente (`supabase login`
  pede fluxo interativo no navegador). Migrations futuras: ou o usuário gera um Personal Access
  Token (Account > Access Tokens) para eu usar `supabase link`/`db push`, ou continuamos colando
  SQL manualmente no SQL Editor — decidir quando a próxima migration estiver pronta.

## Decisões em aberto / para revisitar

- Nenhuma pendente no momento. Se surgir uma dúvida de arquitetura durante a Fase 1, registrar
  aqui antes de decidir sozinho.

## Notas úteis

- O clone de inspeção do sistema Laravel antigo está em
  `c:\Desenv\VSCode\ProjetosReact\placehub_temp` (fora do repo novo, só para consulta pontual
  ao domínio de negócio original; pode ser removido quando não for mais necessário).
