# Arquitetura

Referência rápida das decisões técnicas e do porquê de cada uma. Para a análise completa de
melhorias em relação ao sistema Laravel anterior, ver o histórico de planejamento na raiz do
repo antigo (`placehub` Laravel) não se aplica aqui — este documento é a versão viva/atualizada
dessas decisões.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Front-end | Vite + React 19 + TypeScript | pedido do usuário |
| Estilo | Tailwind CSS v4 + shadcn/ui (base Radix; tema próprio "SaaS colorido" — ver abaixo) | componentes acessíveis prontos; tema customizado para não ficar genérico |
| Roteamento | React Router v7 | padrão maduro para SPA na Vercel |
| Server state | `@supabase/supabase-js` + TanStack Query | cache/mutations sem reinventar |
| Formulários | react-hook-form + zod | integra com os componentes `<Form>` do shadcn |
| Tabelas | TanStack Table | padrão *data table* do shadcn |
| Gráficos | Recharts | base dos componentes `chart` do shadcn |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | pedido do usuário; RLS nativa resolve isolamento multi-tenant |
| E-mail | Resend | pedido do usuário |
| Deploy | Vercel | pedido do usuário |

## Multi-tenancy

- Cada imobiliária (`tenant`) é servida em `{slug}.placehub.app`. A plataforma (super-admin)
  fica em `app.placehub.app`. O domínio apex (`placehub.app`) redireciona para `app.`.
- A resolução de qual tenant está sendo servido é **client-side**: lê-se
  `window.location.hostname`, extrai o primeiro label e busca o tenant no Supabase. Não há
  Edge Middleware — a SPA é estática na Vercel, com domínio wildcard apontando para o mesmo
  deployment.
- **Home pública vs. área logada**: a home do tenant (`/`) é **pública** — portal de anúncios
  (catálogo real chega na Fase 2; por enquanto é um placeholder), sem exigir login, com um botão
  "Entrar" levando para `/login`. A plataforma não tem conteúdo público (mesmo comportamento do
  sistema anterior: `/plataforma` sempre foi só o login) — `app.placehub.app/` sem sessão
  redireciona direto para `/login`. Rotas protegidas (`/dashboard`, `/tenants`, etc.) redirecionam
  para `/login` quando não há sessão, em vez de a aplicação inteira virar uma tela de login.
- **Login único**: o mesmo formulário de login é servido em qualquer subdomínio. A sessão do
  Supabase Auth usa um storage baseado em **cookie no domínio raiz** (`.placehub.app`, ver
  `src/lib/cookie-storage.ts`) em vez do `localStorage` padrão — assim, autenticar em
  `app.placehub.app` também vale em `casah.placehub.app`, sem pedir login de novo. Pós-login,
  o app lê o `profile` do usuário e redireciona: `tenant_id IS NULL` (role `super_admin`) →
  console da plataforma; caso contrário → `{tenant.slug}.placehub.app/dashboard`.
- O cookie compartilhado é só uma conveniência de SSO entre os *nossos* subdomínios — não
  afeta o isolamento de dados, que é garantido pela RLS (abaixo), nem funciona em domínio
  próprio de tenant (esse caso pede login de novo, é aceitável).
- **Dev local:** o Chrome trata `localhost` como *public suffix* (proteção anti-supercookie) e
  **rejeita silenciosamente** um cookie `Domain=.localhost` setado a partir de um subdomínio
  (`app.localhost` → falha até para si mesmo, não só entre subdomínios). Isso não acontece em
  produção com um domínio registrado de verdade. `cookie-storage.ts` detecta esse caso e usa
  cookie host-only em `localhost` — login funciona normalmente em cada subdomínio, só o SSO
  *entre* subdomínios não é testável via `*.localhost` puro (para isso, um domínio de dois
  labels via hosts file, ex. `*.placehub.test`, seria necessário — não configurado ainda).

## Isolamento de dados (segurança)

Toda tabela de negócio tem `tenant_id` e Row Level Security habilitada — a garantia de
isolamento vive no banco, não na camada de aplicação. Funções auxiliares em SQL
(`current_tenant_id()`, `is_super_admin()`, `is_tenant_admin()`), todas `SECURITY DEFINER`
com `search_path` fixo, leem o `profile` do usuário autenticado (`auth.uid()`) e alimentam as
policies. Ver `supabase/migrations/20260822004432_init_platform_schema.sql`.

## Modelo de usuários

- `auth.users` (Supabase Auth) é a fonte de identidade/credenciais.
- `public.profiles` (1:1 com `auth.users`) guarda `tenant_id` (nullable — `null` = usuário de
  plataforma/root), `role` (`super_admin | tenant_admin | manager | broker`), dados de perfil.
  Um `CHECK` garante que `super_admin` nunca tem `tenant_id` e todo o resto sempre tem.
- Autorização por módulo é normalizada (`permissions` catálogo + `profile_permissions`), não
  um array solto — permite JOIN/relatório de acesso e validação por FK.
- **Limitação conhecida:** um usuário pertence a exatamente um tenant, e `auth.users.email` é
  único em todo o projeto Supabase (não por tenant) — a mesma pessoa não pode ter o mesmo
  e-mail em duas imobiliárias distintas na plataforma. Se isso virar um problema real, a
  evolução planejada é trocar `profiles.tenant_id` por uma tabela `tenant_memberships`
  many-to-many (ver ROADMAP.md, backlog) — o schema atual foi desenhado para essa migração
  ser um `ALTER TABLE`, não um redesenho.

## Storage

Três buckets, cada um já nascendo com a política de acesso certa: `tenant-branding` (logos,
leitura pública), `property-photos` (leitura pública), `sale-documents` (comprovantes/recibos,
**privado**, só URL assinada).

## Regras de negócio que viram constraint/trigger, não só validação de UI

- Venda concluída (`status = 'completed'`) trava campos financeiros via trigger `BEFORE
  UPDATE` — não é só uma checagem de formulário.
- Conversão de reserva em venda é uma função Postgres transacional
  (`convert_reservation_to_sale`, a implementar na Fase 3) — não duplica criação de
  parcelas/comissões mesmo que chamada de mais de um lugar.
- Expiração de reservas roda via `pg_cron` + Edge Function, não depende de alguém acessar o
  sistema no momento da expiração.

## Tema claro/escuro e identidade visual do tenant

Direção visual escolhida (2026-08-22, comparando 3 opções num canvas de design): **"Dashboard
SaaS colorido"** — fonte Plus Jakarta Sans, cantos bem arredondados (`--radius: 0.875rem`), e as
4 cores de categoria do dashboard (leads/vendas/comissão/conversão) mapeadas nos tokens padrão
`--chart-1`..`--chart-4` do shadcn (azul/verde/âmbar/violeta), para serem reaproveitadas em
qualquer gráfico/stat-tile futuro (Fase 4) sem inventar um novo sistema de cor. `--primary` é o
azul da categoria "leads". Tokens em `src/index.css`, testados nos dois temas.

**Identidade visual por tenant** (`/branding`, só `tenant_admin`): decisão original era limitar a
customização a `--primary`/`--accent` só, deixando o resto vir dos tokens neutros do shadcn.
Revertido a pedido do usuário (2026-08-22) — a tela replica a paridade completa com o sistema
anterior: 15 cores (8 tema claro + 7 tema escuro, incluindo fundo/superfície/texto/texto-
secundário/borda de cada tema, não só primary/accent), cor de fundo do logo com opção de
transparência por tema, e 5 imagens (`logo_light_path`, `logo_dark_path`,
`background_image_path`, `favicon_path`, `placeholder_image_path` — todas em
`supabase/migrations/20260822172344_expand_tenant_branding_fields.sql`).

Em runtime (2026-08-22), as 15 cores do tenant são aplicadas como CSS variables via
`tenantThemeVars()` (`src/features/tenant-branding/apply-tenant-theme.ts`), que mapeia os campos
claro/escuro do tenant para `--background/--foreground/--card/--card-foreground/--popover/
--popover-foreground/--primary/--primary-foreground/--secondary/--secondary-foreground/--muted/
--muted-foreground/--accent/--accent-foreground/--border/--input/--ring` (a cor `*-foreground` de
cada par é calculada por contraste, `src/lib/color-contrast.ts`, não é um campo salvo). O objeto é
passado como `style` inline no wrapper raiz (`AppShell`) do `TenantLayout` e do
`PublicTenantHomePage`, escopando as variables só naquela árvore — sem vazar para o login
(deliberadamente não-tenantizado) nem para o console da plataforma. `--destructive` fica de fora
(erros continuam com a cor padrão do shadcn em todos os tenants). `resolvedTheme` decide se usa o
conjunto claro ou escuro do tenant.

## Casca de layout (`AppShell`)

`src/components/app-shell.tsx` é o layout compartilhado por `TenantLayout`, `PlatformLayout`,
`PublicTenantHomePage` e `LoginPage`: cabeçalho e rodapé são **`position: fixed`** de verdade
(altura fixa `h-16`/`h-11`, sobrepostos ao conteúdo), com `bg-background/70 backdrop-blur-xl`.
`<main>` ocupa o resto da tela (`absolute inset-x-0 top-16 bottom-11 overflow-y-auto`) e é o único
elemento que rola. Replica o padrão do `guest.blade.php` do sistema anterior — **a translucidez só
fica visível de fato porque o conteúdo passa por baixo do cabeçalho/rodapé ao rolar**; uma versão
anterior desta casca usava `shrink-0` (header/main/footer empilhados, sem sobreposição), o que
deixava a opacidade tecnicamente aplicada mas invisível a olho nu (nada por trás pra misturar).
Conteúdo centralizado em `mx-auto max-w-7xl` dentro do `<main>`. `LogoBadge` replica o padrão
antigo de logo com fundo próprio (cor sólida ou transparente, conforme
`logo_{light,dark}_background_transparent` do tenant).

**Nota sobre alturas fixas:** as classes `top-16`/`bottom-11` do `<main>` têm que bater exatamente
com `h-16`/`h-11` do cabeçalho/rodapé — são escritas por extenso no JSX (não geradas via
`` `top-${n}` `` nem `.replace()`), porque o Tailwind só inclui no CSS final classes que aparecem
como texto literal no código-fonte (scanner estático, não em runtime).

## Preview de imagem com transparência (`bg-checkerboard`)

Os campos de upload de imagem (`BrandingUploadField`) mostram a miniatura sobre um fundo em
xadrez (`.bg-checkerboard`, `src/index.css`) em vez de uma cor sólida — mesmo padrão do
Figma/Photoshop. Motivo: numa miniatura de 64px sobre um cartão branco (tema claro), uma imagem
com fundo `transparent` fica visualmente idêntica a uma com fundo branco — não dá pra saber, só
olhando, se a transparência foi realmente respeitada. Com o xadrez atrás, qualquer área
transparente da imagem (real, do PNG, ou da nossa cor de fundo configurável dos logos) aparece
óbvia. Implementação: dois `div` empilhados (`relative`/`absolute inset-0`) — o de baixo tem o
xadrez fixo, o de cima recebe o `previewStyle` (cor sólida ou `transparent`) e a imagem.

## O que este documento não cobre

Decisões de UI específicas de cada tela e o detalhamento de cada regra de negócio vivem no
código e nos PRs que as implementam, não aqui — este arquivo é para decisões que atravessam
o projeto inteiro e são caras de reverter.
