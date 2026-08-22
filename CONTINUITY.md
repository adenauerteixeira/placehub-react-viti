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

**Estado do git:** repositório local ainda **não inicializado** — nada commitado ainda.

## Próximos passos imediatos

1. `git init` + primeiro commit no projeto local.
2. Confirmar com o usuário antes de configurar o remote e dar push para
   `https://github.com/adenauerteixeira/placehub-react-viti.git` (repo remoto já existe, vazio).
3. Pedir ao usuário para criar as contas externas e passar as credenciais (nenhuma delas pode
   ser criada por mim):
   - **Supabase**: novo projeto → URL e anon key para `.env.local`.
   - **Vercel**: projeto conectado ao repo + domínio `placehub.app` com wildcard `*.placehub.app`.
   - **Resend**: conta + domínio de envio verificado + API key (vai como secret do Supabase,
     nunca no front).
4. Depois disso: `npx supabase link` + `npx supabase db push` para aplicar a migration inicial
   no projeto real, e começar a Fase 1 do [ROADMAP.md](./ROADMAP.md) (login único, resolução de
   tenant por subdomínio, console da plataforma).

## Decisões em aberto / para revisitar

- Nenhuma pendente no momento. Se surgir uma dúvida de arquitetura durante a Fase 1, registrar
  aqui antes de decidir sozinho.

## Notas úteis

- O clone de inspeção do sistema Laravel antigo está em
  `c:\Desenv\VSCode\ProjetosReact\placehub_temp` (fora do repo novo, só para consulta pontual
  ao domínio de negócio original; pode ser removido quando não for mais necessário).
