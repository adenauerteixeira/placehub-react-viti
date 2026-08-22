# Continuidade — onde paramos

> Atualize este arquivo ao final de cada sessão de trabalho relevante. Objetivo: qualquer um
> (ou qualquer sessão nova do Claude) consegue retomar só lendo isto, sem precisar vasculhar
> o histórico da conversa. Histórico detalhado do que foi feito fica no
> [CHANGELOG.md](./CHANGELOG.md) — aqui é só o estado atual e os próximos passos.

## Estado atual — 2026-08-22

- **Repo:** `https://github.com/adenauerteixeira/placehub-react-viti.git`, branch `trunk`, tudo
  commitado e enviado (push sem pedir confirmação — permissão permanente do usuário).
- **Supabase:** projeto real em uso (`placehub.plataforma's Project`). Todas as migrations até
  `20260822163342_create_tenant_branding_bucket.sql` aplicadas com sucesso via SQL Editor (CLI
  ainda não autenticado neste ambiente — ver nota abaixo). Duas Edge Functions no ar:
  `create-tenant-admin` e `invite-tenant-user`. Bucket `tenant-branding` criado.
- **Dados reais no banco:** um `super_admin` (`root@gmail.com`) e um tenant, **Casah**
  (slug `casah`, com cor primária `#e11d48` e logo claro definidos), com um `tenant_admin`
  (`tenant.adm@gmail.com`) e um `broker` (`corretor.qa@example.com` — criado testando o convite
  de usuários, pode remover ou manter).
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
  - Identidade visual do tenant (`/branding`, só `tenant_admin`): cores (CSS vars escopadas,
    não vazam pra plataforma nem outros tenants) e logo/favicon (bucket `tenant-branding`,
    upload restrito por policy no path). Reflete no painel do tenant e na home pública.
- **Visual:** direção escolhida foi "Dashboard SaaS colorido" (de 3 opções comparadas num canvas
  de design), tema claro. Aplicado em `src/index.css`: fonte Plus Jakarta Sans, `--radius` maior,
  cores de categoria em `--chart-1`..`--chart-4`. Testado nos dois temas (claro/escuro) via
  screenshot. Toggle de tema simplificado (clique único, sem menu).
- `npm run build` e `npm run lint` limpos.

## Próximos passos imediatos

**Fase 1 está completa** (só falta o conteúdo real do dashboard, que é escopo da Fase 4 por
design). Próximo passo natural: **Fase 2 — Catálogo** (empreendimentos, proprietários, anúncios/
imóveis com portal público, parceiros, corretores). Ver [ROADMAP.md](./ROADMAP.md).

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
