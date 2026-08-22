# Continuidade — onde paramos

> Atualize este arquivo ao final de cada sessão de trabalho relevante. Objetivo: qualquer um
> (ou qualquer sessão nova do Claude) consegue retomar só lendo isto, sem precisar vasculhar
> o histórico da conversa. Histórico detalhado do que foi feito fica no
> [CHANGELOG.md](./CHANGELOG.md) — aqui é só o estado atual e os próximos passos.

## Estado atual — 2026-08-22

- **Repo:** `https://github.com/adenauerteixeira/placehub-react-viti.git`, branch `trunk`, tudo
  commitado e enviado (push sem pedir confirmação — permissão permanente do usuário).
- **Supabase:** projeto real em uso (`placehub.plataforma's Project`). Todas as migrations até
  `20260822120251_allow_manual_profile_creation.sql` aplicadas com sucesso via SQL Editor (CLI
  ainda não autenticado neste ambiente — ver nota abaixo).
- **Dados reais no banco:** um `super_admin` (`root@gmail.com`) e um tenant, **Casah**
  (slug `casah`), com um `tenant_admin` (`tenant.adm@gmail.com`).
- **Funcional e testado ponta a ponta** (navegador headless, contra o Supabase real):
  - Login único (`/login`), redirecionamento pós-login por role/tenant.
  - Home pública do tenant (placeholder "anúncios em breve") e da plataforma (vai direto pro
    login — nunca teve conteúdo público).
  - Console da plataforma: CRUD de tenants (criar/editar/ativar-desativar), tudo direto no
    client via RLS — sem Edge Function. Vínculo do primeiro `tenant_admin` ainda é manual (ver
    "Próximos passos").
  - Dashboard do tenant (placeholder), com `TenantProtectedShell` resolvendo tenant/role.
  - Rotas protegidas redirecionam para `/login` quando não há sessão (não é mais um gate global).
- **Visual:** direção escolhida foi "Dashboard SaaS colorido" (de 3 opções comparadas num canvas
  de design), tema claro. Aplicado em `src/index.css`: fonte Plus Jakarta Sans, `--radius` maior,
  cores de categoria em `--chart-1`..`--chart-4`. Testado nos dois temas (claro/escuro) via
  screenshot. Toggle de tema simplificado (clique único, sem menu).
- `npm run build` e `npm run lint` limpos.

## Próximos passos imediatos

1. Trocar o fluxo manual de "Vincular administrador" (usuário criado no painel + SQL colado) por
   uma Edge Function com service role chamando a Admin API — precisa do CLI do Supabase
   autenticado (ou aplicar a função manualmente pelo painel) quando chegar nessa parte.
2. Gestão de usuários do tenant e identidade visual (resto da Fase 1 — ver
   [ROADMAP.md](./ROADMAP.md)).

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

## Decisões em aberto / para revisitar

- Nenhuma pendente no momento. Se surgir uma dúvida de arquitetura, registrar aqui antes de
  decidir sozinho.

## Notas úteis

- O clone de inspeção do sistema Laravel antigo está em
  `c:\Desenv\VSCode\ProjetosReact\placehub_temp` (fora do repo novo, só para consulta pontual
  ao domínio de negócio original; pode ser removido quando não for mais necessário).
