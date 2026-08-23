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
- "Plano de fundo", "Favicon" e "Anúncio sem foto" (`/branding`) ganharam a mesma apresentação em
  card dos logos claro/escuro (borda arredondada, preview maior empilhado acima dos botões, texto
  explicando pra que serve cada imagem) — antes ficavam soltos num grid de 3 colunas sem moldura,
  com visual bem mais pobre que os logos ao lado. `BrandingUploadField` ganhou a prop `stacked`
  pra essa variante de layout (preview em cima, botões embaixo, melhor pra colunas estreitas).

### Adicionado

- Identidade visual do tenant (`/branding`, restrita a `tenant_admin`), com paridade completa
  de opções em relação ao sistema anterior (pedido do usuário, revisando a versão inicial mais
  enxuta): 15 cores (8 tema claro + 7 tema escuro — primária/secundária/destaque, fundo,
  superfície, texto, texto secundário, borda), cor de fundo do logo com opção de transparência
  por tema, 5 imagens (logo claro/escuro, plano de fundo, favicon, imagem padrão pra imóvel sem
  foto) com upload imediato e remoção, botão "Restaurar cores padrão" por tema, e um preview de
  cartão de exemplo em tempo real por tema (`branding-preview-card.tsx`) — mesmos valores-padrão
  do sistema anterior (`defaults.ts`). Migration
  `20260822172344_expand_tenant_branding_fields.sql`. Bucket `tenant-branding`
  (`20260822163342_create_tenant_branding_bucket.sql`), público pra leitura, escrita restrita ao
  `tenant_admin` do próprio tenant via policy no primeiro segmento do caminho do arquivo
  (`{tenant_id}/...`). Testado ponta a ponta: todas as seções renderizam, editar e salvar cores
  persiste no banco, enviar/remover imagem reflete corretamente conforme o estado real.
- Paleta completa do tenant (15 cores, claro e escuro) agora é aplicada de fato em todo o app do
  tenant, não só `--primary`/`--accent` — `tenantThemeVars()` mapeia cada campo do tenant para os
  tokens do shadcn (background/card/popover/primary/secondary/muted/accent/border/input/ring),
  com cor de texto (`*-foreground`) calculada por contraste (`src/lib/color-contrast.ts`).
  Aplicado no `TenantLayout` e no `PublicTenantHomePage`; login e console da plataforma
  permanecem com o tema neutro (não são tenantizados). Ver ARCHITECTURE.md.
- Casca de layout compartilhada (`AppShell`, `src/components/app-shell.tsx`) usada por
  `TenantLayout`, `PlatformLayout`, `PublicTenantHomePage` e `LoginPage`: cabeçalho e rodapé
  fixos com fundo translúcido (`bg-background/80 backdrop-blur-md`), conteúdo centralizado
  (`mx-auto max-w-7xl`), e área central com `overflow-y-auto` isolado (`h-dvh` na raiz) para
  caber sem barra de rolagem da página sempre que possível — replica o padrão do sistema Laravel
  original (`layouts/app.blade.php`, `layouts/footer.blade.php`, `layouts/guest.blade.php`).
  Rodapé novo em todos os 4 contextos (antes só existia implicitamente, sem rodapé nenhum).
  `PlatformLayout` ganhou também um link de navegação "Imobiliárias" (não tinha nav nenhuma
  antes). `LogoBadge` replica o padrão antigo de logo com fundo próprio (cor sólida ou
  transparente).
- Gestão de usuários do tenant (`/users`, restrita a `tenant_admin`, com link no menu do
  `TenantLayout`): listar, convidar (nome/e-mail/senha/papel/permissões), editar (dados/papel/
  permissões/ativo), ativar/desativar — não é mais possível desativar a si mesmo.
  - Coluna `profiles.email` (denormalizada de `auth.users`, mantida em sincronia por trigger em
    `UPDATE OF email`) — o client não consegue ler `auth.users` diretamente, e a tela precisa
    listar e-mail. Migration `20260822160905_add_email_to_profiles.sql`.
  - Edge Function `invite-tenant-user`: cria o usuário no tenant de quem chama — `tenant_id`
    nunca vem do corpo da requisição, sempre do profile de quem está autenticado (não dá pra um
    tenant_admin criar usuário em outro tenant manipulando a chamada). Só `tenant_admin` pode
    chamar (mesmo limite da policy `profiles_update`, de propósito — RLS é a fonte de verdade).
  - Testado ponta a ponta: convidar → aparece na lista → papel e permissões salvos → editar
    carrega os dados certos → e-mail duplicado dá erro amigável.
- Edge Function `create-tenant-admin` (`supabase/functions/create-tenant-admin/index.ts`):
  cria o `tenant_admin` de um tenant via Admin API (`auth.admin.createUser` com
  `user_metadata.tenant_id`/`role`, que o trigger `handle_new_user` já sabe interpretar).
  Verifica dentro da própria função que quem chama é `super_admin` (não confia no client).
  Substitui o fluxo manual de SQL colado — `LinkAdminDialog` agora chama a função direto.
  Aplicada no Supabase real e testada ponta a ponta (criar administrador → logar → cair no
  dashboard do tenant certo com role `tenant_admin`).
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

- Favicon do tenant (`favicon_path`) nunca era aplicado na aba do navegador — o upload salvava o
  arquivo no Storage e a coluna no banco corretamente, mas nada no app trocava o
  `<link rel="icon">` de `index.html` (que ficava sempre no favicon estático padrão). Adicionado
  `useTenantFavicon()` (`src/features/tenant-branding/use-tenant-favicon.ts`), usado no
  `TenantLayout` e no `PublicTenantHomePage`, que atualiza `href`/`type` do link em runtime
  conforme a extensão do arquivo (.ico/.png/.svg/...) e volta ao favicon padrão fora do contexto
  do tenant. Testado ponta a ponta: upload troca o ícone na hora e o valor persiste depois de um
  reload completo da página.
- Bucket `tenant-branding` só aceitava `image/png`, `image/jpeg`, `image/webp` e `image/svg+xml`
  no Storage — um favicon `.ico` era rejeitado ali (`mime type image/x-icon is not supported`)
  mesmo depois de corrigido o seletor de arquivo do navegador (item abaixo). Corrigido em
  `20260822182500_allow_ico_favicon_mime.sql`, adicionando `image/x-icon` e
  `image/vnd.microsoft.icon` à lista.
- Opacidade do cabeçalho/rodapé ficava tecnicamente aplicada (CSS correto) mas invisível a olho
  nu — como o `AppShell` empilhava header/main/footer sem sobreposição (`shrink-0`, não
  `position: fixed`), não havia nada por trás pra misturar com a translucidez. Corrigido usando
  `position: fixed` de verdade (altura fixa `h-16`/`h-11`) com o `<main>` passando por baixo ao
  rolar — agora dá pra ver o conteúdo desfocado atrás do cabeçalho/rodapé, como no
  `guest.blade.php` original. Ver ARCHITECTURE.md.
- Favicon (.ico) não aparecia como opção selecionável no seletor de arquivos do sistema
  operacional — o navegador filtra pelo MIME type do `accept`, e `.ico` costuma ser reportado com
  um MIME inconsistente ou vazio. Corrigido incluindo a extensão `.ico` diretamente no `accept`
  (além do MIME), que os navegadores também aceitam como filtro.
- Preview dos campos de upload de imagem (logo, plano de fundo, favicon, anúncio sem foto) usava
  um fundo cinza sólido (`bg-muted`) atrás da miniatura — numa imagem com fundo realmente
  transparente sobre um cartão branco, isso é visualmente indistinguível de uma imagem com fundo
  branco, então não dava pra confirmar se a transparência do PNG estava sendo respeitada. Trocado
  por um fundo em xadrez (`.bg-checkerboard`), que deixa qualquer área transparente óbvia. Ver
  ARCHITECTURE.md.
- Rótulo "Imagem sem foto" renomeado para **"Anúncio sem foto"** — é a imagem usada como capa de
  um anúncio/imóvel quando ele é cadastrado sem nenhuma foto própria (Fase 2), não uma imagem
  genérica de espaço reservado.
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
- Logo com fundo transparente (PNG) aparecia com uma caixa branca atrás no cabeçalho/preview —
  `logo_light_background_color`/`logo_dark_background_color` nasciam com
  `*_background_transparent = false` por padrão (schema original espelhava o sistema anterior,
  que exigia escolher a cor mesmo pra PNG transparente). Corrigido em
  `20260822181810_default_transparent_logo_backgrounds.sql`: `default true` daqui pra frente, e
  `update` retroativo nos tenants já existentes.
- Conteúdo das páginas ficava alinhado à esquerda em telas largas (`max-w-*` sem `mx-auto`, sem
  wrapper centralizando o `<main>`) — corrigido centralizando via `AppShell` (ver seção
  "Adicionado" acima) e adicionando `mx-auto` nos cartões estreitos que ainda não usavam.

