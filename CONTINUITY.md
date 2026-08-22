# Continuidade — onde paramos

> Atualize este arquivo ao final de cada sessão de trabalho relevante. Objetivo: qualquer um
> (ou qualquer sessão nova do Claude) consegue retomar só lendo isto, sem precisar vasculhar
> o histórico da conversa. Histórico detalhado do que foi feito fica no
> [CHANGELOG.md](./CHANGELOG.md) — aqui é só o estado atual e os próximos passos.

## Estado atual — 2026-08-22

- **Repo:** `https://github.com/adenauerteixeira/placehub-react-viti.git`, branch `trunk`, tudo
  commitado e enviado (push sem pedir confirmação — permissão permanente do usuário).
- **Supabase:** projeto real em uso (`placehub.plataforma's Project`). Todas as migrations até
  `20260822172344_expand_tenant_branding_fields.sql` aplicadas com sucesso via SQL Editor (CLI
  ainda não autenticado neste ambiente — ver nota abaixo). Duas Edge Functions no ar:
  `create-tenant-admin` e `invite-tenant-user`. Bucket `tenant-branding` criado.
- **Dados reais no banco:** um `super_admin` (`root@gmail.com`) e um tenant, **Casah**
  (slug `casah`, com cor primária `#e11d48`, `dark_surface_color` `#111827`, logo claro/escuro
  e favicon definidos), com um `tenant_admin` (`tenant.adm@gmail.com`) e um `broker`
  (`corretor.qa@example.com` — criado testando o convite de usuários, pode remover ou manter).
- **Funcional e testado ponta a ponta** (navegador headless, contra o Supabase real):
  - Login único (`/login`), redirecionamento pós-login por role/tenant.
  - Home pública do tenant (placeholder "anúncios em breve") e da plataforma (vai direto pro
    login — nunca teve conteúdo público).
  - Console da plataforma: CRUD de tenants (criar/editar/ativar-desativar), tudo direto no
    client via RLS. Vínculo do primeiro `tenant_admin` via Edge Function `create-tenant-admin`
    — **aplicada e testada ponta a ponta**: cria o usuário, loga, cai no `/dashboard` do tenant
    certo com role `tenant_admin`.
  - Dashboard do tenant (placeholder), com `TenantProtectedShell` resolvendo tenant/role.
  - Rotas protegidas redirecionam para `/login` quando não há sessão (não é mais um gate global).
  - Gestão de usuários do tenant (`/users`, só `tenant_admin`): convidar (Edge Function
    `invite-tenant-user`, `tenant_id` sempre do profile de quem chama, nunca do body), editar
    papel/dados/permissões, ativar/desativar (não dá pra desativar a si mesmo).
  - Identidade visual do tenant (`/branding`, só `tenant_admin`) — **paridade completa com o
    sistema anterior**, a pedido do usuário (ver `.../casah/configuracoes/identidade-visual` no
    Laravel antigo): 15 cores tema claro/escuro, fundo do logo com transparência, 5 imagens
    (logo claro/escuro, plano de fundo, favicon, imagem sem foto) com upload/remoção, restaurar
    padrão, preview de cartão por tema. Bucket `tenant-branding`, upload restrito por policy no
    path. **As 15 cores agora são aplicadas de fato em todo o app do tenant** (claro e escuro),
    não só preview isolado — ver `AppShell`/`tenantThemeVars()` abaixo.
- **Ajustes de layout pós-Fase 1 (2026-08-22), a pedido do usuário — todos testados
  visualmente (claro/escuro, screenshots via `browser-automation`):**
  - `AppShell` (`src/components/app-shell.tsx`), casca compartilhada por `TenantLayout`,
    `PlatformLayout`, `PublicTenantHomePage` e `LoginPage`: conteúdo centralizado
    (`mx-auto max-w-7xl`), cabeçalho/rodapé fixos com fundo translúcido
    (`bg-background/80 backdrop-blur-md`), `h-dvh` + `overflow-y-auto` só no `<main>` pra caber
    sem scrollbar da página quando possível. Rodapé novo nos 4 contextos (não existia antes).
    Replica o padrão do Laravel antigo (`layouts/app.blade.php`/`footer.blade.php`/
    `guest.blade.php`).
  - `tenantThemeVars()` (`src/features/tenant-branding/apply-tenant-theme.ts`) aplica as 15
    cores do tenant como CSS variables reais nos tokens do shadcn (não só `--primary`/`--accent`
    como antes), com `*-foreground` calculado por contraste. Escopado no `TenantLayout`/
    `PublicTenantHomePage` só — login e console da plataforma continuam neutros de propósito.
  - Corrigido bug de logo transparente aparecendo com caixa branca:
    `logo_{light,dark}_background_transparent` nascia `false` por padrão. Migration
    `20260822181810_default_transparent_logo_backgrounds.sql` (default `true` + `update`
    retroativo) — **aplicada e confirmada** (Casah já mostra "Transparente" marcado e o logo
    sem caixa no header).
  - Detalhes completos em ARCHITECTURE.md e CHANGELOG.md.
- **Visual:** direção escolhida foi "Dashboard SaaS colorido" (de 3 opções comparadas num canvas
  de design), tema claro. Aplicado em `src/index.css`: fonte Plus Jakarta Sans, `--radius` maior,
  cores de categoria em `--chart-1`..`--chart-4`. Testado nos dois temas (claro/escuro) via
  screenshot. Toggle de tema simplificado (clique único, sem menu).
- `npm run build` e `npm run lint` limpos.

## Próximos passos imediatos

**Fase 1 está completa**, incluindo a rodada de ajustes de layout/tema acima (só falta o
conteúdo real do dashboard, que é escopo da Fase 4 por design). Próximo passo natural: **Fase 2 —
Catálogo** (empreendimentos, proprietários, anúncios/imóveis com portal público, parceiros,
corretores). Ver [ROADMAP.md](./ROADMAP.md). Ainda não confirmado com o usuário se seguimos
direto pra Fase 2 ou se há mais algum ajuste antes.

Sem pendência bloqueante. Limpeza de dados de teste no Supabase fica pra quando for conveniente
(ver "Notas técnicas" abaixo — não é urgente, nenhum é destrutivo deixar).

## Notas técnicas para retomar

- CLI do Supabase (`npx supabase`) ainda não está autenticado neste ambiente (`supabase login`
  pede fluxo interativo no navegador). Migrations: ou o usuário gera um Personal Access Token
  (Account > Access Tokens) para eu usar `supabase link`/`db push`, ou continuamos colando SQL
  manualmente no SQL Editor.
- **Ao pedir para o usuário rodar SQL no painel: cole o SQL diretamente na mensagem de chat**, não
  como arquivo anexado — já aconteceu de arquivos enviados via SendUserFile passarem
  despercebidos.
- Testes locais de subdomínio: usar `http://app.localhost:5173`, `http://casah.localhost:5173`
  etc. (Chrome resolve `*.localhost` para 127.0.0.1 nativamente, sem mexer no hosts file). O SSO
  *entre* subdomínios (cookie compartilhado) não é testável assim — ver ARCHITECTURE.md.
- Ao rodar QA com o skill `browser-automation` neste projeto: sempre reiniciar o dev server
  (matar processo na porta, subir de novo, esperar "assentar" uns 3s) antes de testar depois de
  editar arquivos — testar durante uma janela de HMR ativo produz `ERR_ABORTED` em cascata que
  não tem nada a ver com bugs reais do app.
- **`lsof -ti:5173 | xargs kill` NÃO mata o servidor de dev neste ambiente** (Windows/Git Bash,
  listener em `[::1]`) — falha silenciosamente, sem erro. Use `netstat -ano | grep LISTENING |
  grep :5173` pra achar o PID real e `taskkill //F //PID <pid>`. Já causou uma sessão inteira de
  debug perseguindo um "bug" que na verdade era um processo zumbi servindo a versão antiga do
  código.
- Credenciais de teste (ambiente de desenvolvimento, não são segredo de produção):
  `root@gmail.com` (super_admin) e `tenant.adm@gmail.com` (tenant_admin do Casah) — senhas não
  registradas aqui de propósito; pedir ao usuário se precisar re-testar.
- **Edge Functions no painel do Supabase**: por padrão vêm com "Enforce JWT Verification"
  ligado, que barra até o preflight `OPTIONS` do CORS (a requisição nunca chega no código da
  função) — precisa desligar essa opção nas functions que fazem a própria checagem de auth por
  dentro (como `create-tenant-admin`). Também: o editor da function no painel abre com um
  código de exemplo ("Hello World") que precisa ser **substituído por inteiro**, não colado
  junto — já aconteceu de o deploy "funcionar" mas ainda rodar o código de exemplo antigo.
- Dados de teste pendentes de limpeza no Supabase real (nenhum urgente): tenant `imob-teste-qa`
  (`delete from public.tenants where slug = 'imob-teste-qa';`, cascade no profile) e os usuários
  de auth `edgefn.qa3@example.com` e `corretor.qa@example.com` (remover em Authentication →
  Users no painel, se quiser — não é destrutivo deixá-los, só sobram sem uso).

## Decisões em aberto / para revisitar

- Nenhuma pendente no momento. Se surgir uma dúvida de arquitetura, registrar aqui antes de
  decidir sozinho.

## Notas úteis

- O clone de inspeção do sistema Laravel antigo está em
  `c:\Desenv\VSCode\ProjetosReact\placehub_temp` (fora do repo novo, só para consulta pontual
  ao domínio de negócio original; pode ser removido quando não for mais necessário).
