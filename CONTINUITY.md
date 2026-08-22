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
  - Console da plataforma: listagem de tenants (só leitura).
  - Dashboard do tenant (placeholder), com `TenantProtectedShell` resolvendo tenant/role.
  - Rotas protegidas redirecionam para `/login` quando não há sessão (não é mais um gate global).
- `npm run build` e `npm run lint` limpos.

## Próximos passos imediatos

1. CRUD de tenants no console da plataforma (criar/editar/ativar-desativar). Criar um tenant
   precisa também criar o primeiro `tenant_admin` — isso exige uma Edge Function com service
   role (Admin API), porque o painel do Supabase não expõe `user_metadata` no Add User (foi por
   isso que o Casah precisou do fluxo manual: criar pelo painel sem metadata + eu inserir o
   profile via SQL depois). Vou precisar que o usuário tenha o CLI do Supabase autenticado (ou
   aplique a Edge Function manualmente) quando chegar nessa parte.
2. Depois do CRUD: gestão de usuários do tenant e identidade visual (resto da Fase 1 —
   ver [ROADMAP.md](./ROADMAP.md)).

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
