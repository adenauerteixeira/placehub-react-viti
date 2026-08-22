# PlaceHub

SaaS multi-tenant para gestão comercial imobiliária: catálogo de imóveis/empreendimentos,
funil comercial (leads → negociações → propostas → reservas → vendas), comissionamento de
corretores, portal público por imobiliária e um console de plataforma para administrar os
tenants.

Reescrita em React, substituindo a versão anterior em Laravel. As decisões de arquitetura e
o porquê de cada uma estão em [ARCHITECTURE.md](./ARCHITECTURE.md); o plano de fases em
[ROADMAP.md](./ROADMAP.md); o histórico de mudanças em [CHANGELOG.md](./CHANGELOG.md); e o
estado atual do trabalho (onde paramos) em [CONTINUITY.md](./CONTINUITY.md).

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
