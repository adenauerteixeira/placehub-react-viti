# PlaceHub

SaaS multi-tenant para gestão comercial imobiliária: catálogo de imóveis/empreendimentos,
funil comercial (leads → negociações → propostas → reservas → vendas), comissionamento de
corretores, portal público por imobiliária e um console de plataforma para administrar os
tenants.

Reescrita em React, substituindo a versão anterior em Laravel. As decisões de arquitetura e
o porquê de cada uma estão em [ARCHITECTURE.md](./ARCHITECTURE.md); o plano de fases em
[ROADMAP.md](./ROADMAP.md); o histórico de mudanças em [CHANGELOG.md](./CHANGELOG.md); e o
estado atual do trabalho (onde paramos) em [CONTINUITY.md](./CONTINUITY.md).

## Produção

- Plataforma: [app.placehubapp.com.br](https://app.placehubapp.com.br) (apex redireciona pra lá).
- Tenant de teste (Casah): [casah.placehubapp.com.br](https://casah.placehubapp.com.br) e também
  em domínio próprio, [casah.imb.br](https://casah.imb.br).
- Deploy automático a cada push em `trunk` (Vercel). Ver [ARCHITECTURE.md](./ARCHITECTURE.md) —
  "Deploy" pra domínios/DNS e "Multi-tenancy" pro roteamento por subdomínio.

## Stack

- **Front-end:** Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query,
  React Router, react-hook-form + zod.
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions), com Row Level Security
  para isolamento entre tenants.
- **E-mail transacional:** Resend.
- **Deploy:** Vercel.

## Rodando localmente

Pré-requisitos: Node 20+, e um projeto Supabase (local via Docker/Supabase CLI, ou um
projeto na nuvem) com as migrations de `supabase/migrations` aplicadas.

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Outros scripts:

```bash
npm run build     # type-check (tsc -b) + build de produção
npm run lint       # oxlint
npm run preview    # serve o build de produção localmente
```

### Acessando por subdomínio

O app resolve plataforma/tenant pelo subdomínio (ver ARCHITECTURE.md). O Chrome resolve
`*.localhost` para `127.0.0.1` nativamente, sem precisar mexer no hosts file:

- `http://app.localhost:5173` — console da plataforma (login de `super_admin`).
- `http://{slug}.localhost:5173` — site/painel de um tenant (ex: `http://casah.localhost:5173`).
- `http://localhost:5173` (sem subdomínio) — redireciona para a plataforma.

O SSO entre subdomínios (cookie compartilhado) não funciona via `*.localhost` puro — só em
produção, com um domínio real. Ver ARCHITECTURE.md para o porquê.

### Supabase local (opcional)

Com o [Supabase CLI](https://supabase.com/docs/guides/cli) e Docker instalados:

```bash
npx supabase start   # sobe Postgres/Auth/Storage local
npx supabase db reset  # aplica as migrations de supabase/migrations
```

## Estrutura

```
src/
  components/   componentes de UI (inclui components/ui, gerados pelo shadcn)
  features/     um módulo de negócio por pasta (auth, tenants, leads, sales, ...)
  lib/          clientes e utilitários compartilhados (supabase, theme, etc.)
supabase/
  migrations/   schema do banco, versionado
  functions/    Edge Functions (e-mail, jobs agendados, RPCs externos)
```
