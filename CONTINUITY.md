# Continuidade — onde paramos

> Atualize este arquivo ao final de cada sessão de trabalho relevante. Objetivo: qualquer um
> (ou qualquer sessão nova do Claude) consegue retomar só lendo isto, sem precisar vasculhar
> o histórico da conversa. Histórico detalhado do que foi feito fica no
> [CHANGELOG.md](./CHANGELOG.md) — aqui é só o estado atual e os próximos passos.

## Estado atual — 2026-08-23

- **Repo:** `https://github.com/adenauerteixeira/placehub-react-viti.git`, branch `trunk`, tudo
  commitado e enviado (push sem pedir confirmação — permissão permanente do usuário).
- **Supabase:** projeto real em uso (`placehub.plataforma's Project`). Todas as migrations até
  `20260823140000_add_creci_state_to_profiles.sql` aplicadas com sucesso via SQL Editor (CLI
  ainda não autenticado neste ambiente — ver nota abaixo). Três Edge Functions no ar:
  `create-tenant-admin`, `invite-tenant-user` e `update-tenant-user-email` (nova). Buckets:
  `tenant-branding` (logos/favicon do tenant) e `catalog-media` (fotos de corretor + galeria de
  anúncio, novo na Fase 2).
- **Dados reais no banco:** um `super_admin` (`root@gmail.com`) e um tenant, **Casah** (slug
  `casah`), com um `tenant_admin` (`tenant.adm@gmail.com`). Alguns registros de teste da Fase 2
  ficaram no banco (empreendimento/parceiro/proprietário/corretor/anúncio "QA Teste") — não são
  destrutivos deixar, ver "Notas técnicas" pra limpar se quiser.
- **Fase 1 (fundação, auth, tenants, usuários, identidade visual) e Fase 2 (catálogo completo)
  estão fechadas e testadas ponta a ponta contra o Supabase real.** Resumo do que existe hoje:
  - Login único (`/login`) com redirecionamento pós-login por role/tenant; console da plataforma
    (CRUD de tenants); gestão de usuários do tenant (convite/papéis/permissões por módulo);
    identidade visual completa (15 cores + 5 imagens, aplicadas de fato em todo o app, claro e
    escuro) — detalhes na entrada da Fase 1 abaixo, sem mudança desde a última sessão.
  - **Catálogo (Fase 2), 5 entidades, todas com CRUD completo e testado**: Empreendimentos
    (`/developments`), Parceiros (`/partners`, PF/PJ com validação real de CPF/CNPJ), Corretores
    (`/brokers`, foto + CRECI/UF + comissão + vínculo opcional com login), Proprietários
    (`/owners`, construída do zero — no sistema anterior era um scaffold morto), e Anúncios
    (`/announcements`, a peça central: formulário em abas, galeria com capa unificada, amenidades,
    publicação validada por trigger no banco).
  - **Permissões por módulo finalmente checadas de verdade**: `has_permission()` no banco (RLS) e
    `hasPermission()` no client (nav/rotas) — antes existiam desde a Fase 1 mas nunca eram
    checadas em lugar nenhum.
  - **Portal público reescrito**: home (`/`) lista anúncios publicados agrupados por tipo;
    `/anuncios/:slug` é o detalhe (galeria, vídeo, características, amenidades, WhatsApp);
    `/corretores` e `/corretores/:slug` são a listagem e o perfil público de corretor. **Testado
    como visitante genuinamente anônimo** (zero cookies, sem login) — importante porque a Fase 1
    tinha uma policy (`tenants_select_public`) que já cobria isso pros tenants; as novas policies
    de `announcements`/`brokers`/`developments` seguem o mesmo espírito.
  - Detalhes completos de cada rodada em CHANGELOG.md; decisões de arquitetura/RLS em
    ARCHITECTURE.md.
- **Rodada de polimento pós-Fase 2 (2026-08-23), a pedido do usuário — 10 melhorias, todas
  testadas ponta a ponta contra o Supabase real (inclusive currency mask, lightbox e CEP
  testados via automação de navegador):**
  - `FieldLabel` (`src/components/field-label.tsx`) — label com tooltip de ajuda opcional,
    virou padrão do sistema, aplicado em quase todos os formulários (Fase 1 e 2).
  - `CurrencyInput` (`src/components/currency-input.tsx`) — máscara "R$ 0,00" nos campos de
    preço/condomínio/IPTU de anúncios.
  - `TenantBrand` (`src/features/tenant-branding/tenant-brand.tsx`) — logo **e** nome do tenant
    juntos em todo header (login, painel, portal público) — antes só aparecia um ou outro.
  - CEP com autopreenchimento via ViaCEP (`src/lib/viacep.ts`) no formulário de anúncios.
  - Página de detalhe do anúncio redesenhada com o layout do sistema anterior (card de
    cabeçalho + popover "Falar com um corretor" + grid 2 colunas) e **lightbox de fotos de
    verdade** (foto cheia, setas, teclado Esc/←/→, contador X/Y).
  - Hero de "publicidade da imobiliária" na home pública usando `background_image_path` — campo
    que existia desde a Fase 1 mas nunca tinha sido aplicado em lugar nenhum.
  - Coluna de ações (editar/excluir) na listagem de Anúncios; link "Anúncios" na tela de login;
    correção do botão Salvar não voltando pra listagem de anúncios.
  - Detalhes completos em CHANGELOG.md/ROADMAP.md.
- **2ª rodada de polimento pós-Fase 2 (2026-08-23), a pedido do usuário — 7 pontos, testados
  ponta a ponta (inclusive máscaras e capitalização, via automação de navegador):**
  - `PhoneInput`/`DocumentInput` (`src/components/phone-input.tsx`,
    `src/components/document-input.tsx`) — máscara `(XX) X XXXX-XXXX` (telefone) e
    `XXX.XXX.XXX-XX`/`XX.XXX.XXX/XXXX-XX` (CPF/CNPJ), aplicadas em Parceiros, Proprietários,
    Corretores, Imobiliárias e Usuários do tenant.
  - `capitalizeName()` (`src/lib/capitalize.ts`) — capitaliza campo "Nome" ao sair do campo,
    mantendo minúsculas as preposições de ligação (de/da/das/do/dos/e), exceto na primeira
    palavra. Testado: "joão da silva de souza" → "João da Silva de Souza".
  - Diálogos só fecham por Cancelar/Salvar/X — não mais clicando fora ou Esc (`onInteractOutside`/
    `onEscapeKeyDown` prevenidos em todo `DialogContent`). Corretores ganhou o botão Cancelar que
    não tinha.
  - Ícones (lápis) substituindo texto "Editar"/"Excluir" em todas as listagens; linha da tabela
    não abre mais edição sozinha (só o ícone) — evita clique acidental.
  - Badges de Destaque/Promoção visíveis pro visitante (card público) e na listagem interna.
  - Link "Voltar para anúncios" → só "Voltar".
- **3ª rodada de polimento pós-Fase 2 (2026-08-23), a pedido do usuário — 2 pontos, testados
  ponta a ponta contra o Supabase real via automação de navegador:**
  - Edição de usuário do tenant agora permite corrigir o e-mail de login (Edge Function nova
    `update-tenant-user-email`, mesmo padrão de auth de `invite-tenant-user`: só `tenant_admin`,
    só dentro do próprio tenant, usa `auth.admin.updateUserById` porque `auth.users.email` não
    é editável pelo client). Convite de usuário passou a aceitar CRECI/UF também (faltava —
    `profiles.creci_state` não existia, só `brokers.creci_state`; migration nova cobriu isso).
  - Investigado (e descartado) um status "Inativo" inesperado observado num teste anterior:
    dois testes isolados (só telefone, só e-mail) confirmaram que `EditUserDialog` preserva
    `is_active` corretamente ao salvar — foi artefato de um script de QA anterior clicando no
    elemento errado, não um bug real.
  - Definido o fluxo de branch por fase: `trunk` continua recebendo commits durante o
    desenvolvimento; ao fechar uma fase, cria-se uma branch de snapshot (`fase-N-nome-curto`) a
    partir do commit final, sem trocar a branch de trabalho. `fase-2-catalogo` já criada.
- **4ª rodada de polimento pós-Fase 2 (2026-08-24), a pedido do usuário — 2 correções, testadas
  ponta a ponta via automação de navegador:**
  - Cor da borda (Identidade visual) não se refletia em nenhum outro módulo — `Card`, `Dialog`,
    `Select`, `Popover` e `DropdownMenu` usavam um contorno fixo (`ring-foreground/10`) em vez de
    reagir à variável `--border` do tenant. Como quase toda tela é composta de `Card`, a cor de
    borda configurada parecia não ter efeito nenhum fora da própria tela de Identidade visual.
    Corrigido nos 5 componentes base (`ring-border`).
  - Valor de condomínio (e IPTU) do anúncio salvava certinho mas nunca aparecia pro visitante —
    adicionado na página pública de detalhe, abaixo do preço, só quando preenchido.
- `npm run build` e `npm run lint` limpos.

## Próximos passos imediatos

**Fase 2 e as 4 rodadas de polimento pós-Fase 2 estão fechadas.** Próximo passo natural:
**Fase 3 — Funil comercial** (leads + agenda de contato, negociações, propostas, reservas com
expiração automática, vendas). Ver [ROADMAP.md](./ROADMAP.md). Aguardando o usuário confirmar
início da Fase 3.

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
  (`delete from public.tenants where slug = 'imob-teste-qa';`, cascade no profile), usuários de
  auth `edgefn.qa3@example.com` e `corretor.qa@example.com` (Authentication → Users no painel), e
  os registros "QA Teste"/"QA" criados testando o catálogo na Fase 2 (empreendimento "Residencial
  Vista Verde", parceiro "Imobiliária Parceira QA", proprietário "Maria Proprietária QA", corretor
  "Corretor QA Teste", anúncios "Casa QA Teste 3 quartos" e "Apto QA Toast Teste" — todos do
  tenant Casah, `delete from public.announcements/brokers/owners/partners/developments where name
  ilike '%qa%' or title ilike '%qa%'` cobre a maioria). Nada disso é destrutivo deixar.

## Decisões em aberto / para revisitar

- Nenhuma pendente no momento. Se surgir uma dúvida de arquitetura, registrar aqui antes de
  decidir sozinho.

## Notas úteis

- O clone de inspeção do sistema Laravel antigo está em
  `c:\Desenv\VSCode\ProjetosReact\placehub_temp` (fora do repo novo, só para consulta pontual
  ao domínio de negócio original; pode ser removido quando não for mais necessário).
