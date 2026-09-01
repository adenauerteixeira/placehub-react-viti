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

- Cada imobiliária (`tenant`) é servida em `{slug}.{domínio raiz}`. A plataforma (super-admin)
  fica em `app.{domínio raiz}`. O domínio apex redireciona (client-side) para `app.`. O domínio
  raiz da plataforma é **`placehubapp.com.br`** (não `placehub.app` — já estava registrado por
  terceiros quando chegou a hora do primeiro deploy real; ver "Deploy" abaixo). Um tenant também
  pode ter **domínio próprio** servindo o mesmo deployment — hoje só `casah.imb.br`, configurado
  manualmente (ver ROADMAP.md, item "Domínio próprio por tenant", pro que falta pra virar
  self-serve).
- A resolução de qual tenant está sendo servido é **client-side**: lê-se
  `window.location.hostname`, extrai o primeiro label e busca o tenant no Supabase. Não há
  Edge Middleware — a SPA é estática na Vercel, com domínio wildcard apontando para o mesmo
  deployment. Essa resolução é **agnóstica de qual domínio raiz está em jogo** — funciona igual
  pra `placehubapp.com.br` e pra `imb.br`, sem hardcoded pra um específico (ver
  `src/lib/hostname.ts`, `rootDomain()`/`subdomainLabel()`).
- **Home pública vs. área logada**: a home do tenant (`/`) é **pública** — portal de anúncios
  (catálogo real chega na Fase 2; por enquanto é um placeholder), sem exigir login, com um botão
  "Entrar" levando para `/login`. A plataforma não tem conteúdo público (mesmo comportamento do
  sistema anterior: `/plataforma` sempre foi só o login) — `app.{domínio raiz}/` sem sessão
  redireciona direto para `/login`. Rotas protegidas (`/dashboard`, `/tenants`, etc.) redirecionam
  para `/login` quando não há sessão, em vez de a aplicação inteira virar uma tela de login.
- **Login único**: o mesmo formulário de login é servido em qualquer subdomínio. A sessão do
  Supabase Auth usa um storage baseado em **cookie no domínio raiz** (ver
  `src/lib/cookie-storage.ts`) em vez do `localStorage` padrão — assim, autenticar em
  `app.placehubapp.com.br` também vale em `casah.placehubapp.com.br`, sem pedir login de novo.
  Pós-login, o app lê o `profile` do usuário e redireciona: `tenant_id IS NULL` (role
  `super_admin`) → console da plataforma; caso contrário → `{tenant.slug}.{domínio raiz}/dashboard`.
- O cookie compartilhado é só uma conveniência de SSO entre os *nossos* subdomínios sob o mesmo
  domínio raiz — não afeta o isolamento de dados, que é garantido pela RLS (abaixo). Um domínio
  próprio de tenant (`casah.imb.br`) tem raiz diferente da plataforma, então não compartilha
  sessão com ela (login de novo lá, é aceitável) — mas o login *dentro* desse domínio próprio
  funciona normalmente (ver gotcha de cookie abaixo).
- **Gotcha real (não só de dev local): alguns domínios raiz de 2 labels são tratados como
  *public suffix* pelo navegador**, e um cookie `Domain=.{raiz}` setado a partir de um subdomínio
  é **rejeitado silenciosamente** (nem host-only fica — o cookie simplesmente não é escrito).
  Isso é bem conhecido pra `localhost` em dev (`app.localhost` → falha até pra si mesmo), mas
  **também aconteceu em produção com `imb.br`** (2026-09-01): o Chrome recusou
  `Domain=.imb.br`, o cookie de sessão nunca era persistido, e toda requisição seguinte ia só com
  a *anon key* (sem usuário autenticado de verdade) — RLS de `profiles` retornava 0 linhas e a
  tela travava em "Não foi possível carregar seu perfil" pra qualquer login em `casah.imb.br`.
  Não dá pra prever de antemão quais domínios caem nessa lista (a Public Suffix List pública erra
  pro lado oposto do que precisamos pra resolução de tenant — ver `hostname.ts`). Fix genérico,
  não hardcoded a um domínio: `writeCookie()` (`cookie-storage.ts`) escreve com `Domain=`, **lê de
  volta pra confirmar que colou**, e cai pra cookie host-only se não colou — login local naquele
  domínio funciona normalmente, só não tem SSO entre subdomínios dele (irrelevante pra domínio
  próprio de tenant, que não tem outros subdomínios mesmo). `removeCookie()` limpa as duas
  variantes possíveis, já que não dá pra saber qual delas ficou de pé sem tentar as duas.

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

Buckets, cada um já nascendo com a política de acesso certa (`storage.foldername(name))[1]` =
`tenant_id`, exceto `platform-branding`, que é global): `tenant-branding` (logos/favicon/fundo do
tenant, leitura pública), `catalog-media` (fotos de corretor e galeria de anúncio, leitura
pública, 5 MB/arquivo), `sale-documents` (comprovantes de pagamento/repasse de comissão,
**privado**, só quem tem permissão `sales`/`commissions`), `platform-branding` (favicon/logo/fundo
da plataforma, singleton, leitura pública, escrita só `super_admin`).

## Deploy

- **Vercel** (`place-hub1/placehub`, projeto conectado ao GitHub, deploy automático a cada push em
  `trunk`). `vercel.json` com rewrite de SPA (`/(.*) → /index.html`) — sem isso, qualquer rota
  além de `/` dá 404 direto da Vercel num load/refresh (React Router só resolve client-side).
- **Domínio raiz da plataforma:** `placehubapp.com.br` (apex + `*.placehubapp.com.br`), DNS pela
  própria Vercel (nameservers `ns1`/`ns2.vercel-dns.com` — precisou trocar pra isso: um provedor
  terceiro (Cloudflare) com registro A resolve o tráfego normal, mas a Vercel só consegue emitir
  **certificado wildcard** automaticamente se for ela mesma a autoridade DNS, porque isso exige
  challenge ACME `dns-01` — não dá certo via `http-01`, que é o único que funciona com DNS de
  terceiro). Variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` configuradas em
  Production/Preview/Development na Vercel (não só `.env.local`).
- **Domínio próprio do tenant Casah:** `casah.imb.br`, atrelado ao mesmo projeto Vercel. Mesmo
  motivo do wildcard acima se aplicou aqui também — precisou apontar o domínio inteiro pra Vercel
  (não só um registro A) pra funcionar de verdade com HTTPS.
- **Gotcha de registrador:** o painel "DNS simples" do registro.br (inclusive o modo "avançado" da
  própria interface deles) rejeita `*` como nome de registro pra wildcard, mesmo sendo uma entrada
  de DNS totalmente válida — não tem workaround pela interface deles. Resolvido apontando os
  nameservers do domínio pra Vercel em vez de tentar cadastrar o registro manualmente lá.
- Ver "Multi-tenancy" acima pro porquê do domínio raiz não ser `placehub.app` (já registrado por
  terceiros) e pro gotcha de cookie de sessão que apareceu com `imb.br`.

## Regras de negócio que viram constraint/trigger, não só validação de UI

- Venda concluída (`status = 'completed'`) trava campos financeiros via trigger `BEFORE
  UPDATE` (`sales_guard_financial_lock`) — não é só uma checagem de formulário; só a transição
  pra `cancelled` (e os campos de cancelamento) passa.
- Fechar uma venda é uma função Postgres transacional (`create_sale_from_proposal`, Fase 3 — o
  nome final ficou esse, não `convert_reservation_to_sale` como especulado antes do desenho real):
  cria a venda + parcelas de entrada + bens dados como parte de pagamento, sincroniza
  negociação/anúncio, e converte a reserva ativa (se houver) — tudo numa transação só, sem
  duplicar nada mesmo que chamada de mais de um lugar. Financiamento é sempre calculado dentro da
  função (nunca aceito do client).
- Expiração de reservas (e de propostas vencidas) roda via `pg_cron` chamando uma função SQL
  direto (`run_funnel_expirations()`, a cada minuto) — não depende de alguém acessar o sistema no
  momento da expiração. Decisão revisada em relação ao "pg_cron + Edge Function" especulado antes
  de qualquer desenho real (Fase 3): como a expiração é só mutação de dados, sem chamada externa
  nenhuma, pg_cron → função `plpgsql` direto é mais simples e mais confiável que passar por
  `pg_net`/HTTP dentro do banco pra acionar uma Edge Function. Reservas em si (`reserve_announcement`/
  `cancel_reservation`) também são funções SQL `security definer` — únicas portas de escrita da
  tabela `reservations` (sem policy de INSERT/UPDATE via RLS), garantindo atomicidade entre a
  reserva e o `announcements.status` (published ⇄ reserved) na mesma transação.
- Comissão nasce junto com a venda, não num fluxo separado (Fase 4): `create_sale_from_proposal`
  ganhou `p_commission_percentage` e calcula/insere `commissions` + `commission_installments`
  (pro-rata nas parcelas de entrada) na mesma transação da venda. Repasse ao corretor precisa de
  duas confirmações independentes, ambas via função `security definer` (nunca UPDATE direto):
  `register_broker_commission_payment` (só `tenant_admin`, exige que a parcela já tenha sido
  recebida do cliente) e `confirm_broker_commission_receipt` (só o próprio corretor). Toda
  escrita relevante de venda/comissão passa por `write_audit_log()`, gravando em `audit_logs`
  (tabela imutável, sem `UPDATE`/`updated_at`).
- Dashboard e Relatórios (Fase 4) não filtram corretor manualmente no client — a RLS já restringe
  `leads`/`negotiations`/`proposals`/`sales`/`commissions`/`sale_entry_installments` aos próprios
  registros de um `broker` (ver policies da Fase 3), então a mesma query devolve dados diferentes
  por papel sem `if (isBroker) query.eq('broker_id', ...)` espalhado pela UI.

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
