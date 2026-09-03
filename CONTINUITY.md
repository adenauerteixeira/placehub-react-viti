# Continuidade — onde paramos

> Atualize este arquivo ao final de cada sessão de trabalho relevante. Objetivo: qualquer um
> (ou qualquer sessão nova do Claude) consegue retomar só lendo isto, sem precisar vasculhar
> o histórico da conversa. Histórico detalhado do que foi feito fica no
> [CHANGELOG.md](./CHANGELOG.md) — aqui é só o estado atual e os próximos passos.

## Estado atual — 2026-09-03

- **Aba "Banner" em Identidade Visual — edição completa da Vitrine (2026-09-03).** Nova aba
  separada de "Página pública", reunindo Banner Próprio + anúncios de patrocinadores numa única
  tabela real (linha "Banner Próprio" sempre fixa em primeiro), com diálogos de edição em preview
  ao vivo (`PromoSlide`, compartilhado com o carrossel público): foto, título, ajuste/alinhamento
  de imagem, cor de fundo (com conta-gotas), duração por slide. Dois controles de visibilidade
  independentes (switch global "Mostrar banner" vs. "Ativo" da linha própria, só tira o slide
  próprio da rotação). Opacidade do selo "Publicidade" é config única por tenant (corrigida depois
  de implementada por engano como por-anúncio numa rodada anterior). **Bug real de produção achado
  e corrigido**: fotos de patrocinador bloqueadas por ad blockers (uBlock etc.) porque o caminho de
  storage tinha "banner-ads" no nome — renomeado pra `showcase-slides`, fotos existentes migradas.
  Scrollbar fina em todo o sistema (CSS nativo, tokens de tema — não a lib jQuery SlimScroll
  pedida, incompatível com a stack). 4 migrations novas aplicadas no Supabase real. Ver bloco
  completo no CHANGELOG.md. Testado ao vivo em cada rodada via automação de navegador (tenant_admin
  real, Casah), zero erro de console. **Nota de processo**: sessão rodou várias iterações de
  planejamento (EnterPlanMode) por causa do volume de pedidos incrementais do usuário durante o
  próprio teste ao vivo da feature — padrão que deve se repetir em features de configuração visual
  parecidas (o usuário só percebe o que falta ao ver renderizado, não ao ler a spec).
- **Refinamento de UX/UI — Fases 1 a 5 completas, a pedido do usuário (2026-09-01/02).** Iniciativa
  nova, separada das fases numeradas do ROADMAP.md: diagnóstico completo do app (varredura de
  todas as telas/features), lista de problemas priorizada por impacto, direção visual confirmada
  (manter o tema já decidido, "Dashboard SaaS colorido" — não redesenhar cores, só completar a
  camada de componentes/estados que faltava em cima dele). Processo combinado com o usuário:
  **desde 2026-09-01, nada é commitado/enviado pra produção sem autorização explícita** — cada
  fase é implementada e validada localmente (`npm run dev` + automação de navegador com as
  credenciais reais de teste) antes de pedir autorização pra commit/deploy. Ver bloco completo no
  CHANGELOG.md.
  - **Fase 1 (fundação)**: `useConfirm()` (`src/hooks/use-confirm.tsx`) substitui os 8
    `window.confirm`/`window.prompt` do app por `AlertDialog` estilizado — no processo, endureceu
    de propósito 2 confirmações que não travavam de verdade antes (cancelar reserva não abortava
    nada ao clicar "Cancelar" no popup nativo; marcar negociação como "perdida" prosseguia mesmo
    cancelando o prompt de motivo). Menu mobile (`src/components/mobile-nav.tsx`, `Sheet`) no
    header do tenant e da plataforma — antes a navegação simplesmente quebrava em telas estreitas,
    sem nenhum tratamento. `EmptyState`/`ErrorState` (`src/components/list-state.tsx`) com botão
    "Tentar novamente" em 15 listagens.
  - **Fase 2 (listagens)**: `DataTable` (`src/components/data-table.tsx`) — busca/ordenação/
    paginação client-side, aplicado em 12 listagens (anúncios, leads, tenants, corretores,
    proprietários, parceiros, empreendimentos, reservas, negociações, vendas, comissões, usuários
    do tenant). **Nota técnica importante pra quem mexer nisso de novo**: `@tanstack/react-table`
    instalado é a **v9**, cuja API padrão (`useTable`) é baseada em atoms/store — bem diferente da
    v8 clássica. O `DataTable` usa a camada de compatibilidade oficial `@tanstack/react-table/legacy`
    (`useLegacyTable`), que replica a API v8 (`getCoreRowModel`/`getSortedRowModel`/etc.,
    `flexRender`) — decisão deliberada pra não arriscar a arquitetura nova numa tarefa de UI de
    baixo risco. Se for adicionar uma tabela nova, siga o mesmo padrão do `DataTable` em vez de
    tentar a API v9 direto, a menos que haja um motivo específico pra migrar. Deixados de fora do
    rollout: `proposal-list.tsx` (lista pequena embutida, busca seria ruído) e `reports-page.tsx`
    (usa `window.print()` — paginar cortaria linhas do relatório impresso).
  - Todas as duas fases validadas com `tsc -b`/`oxlint` limpos e testes ao vivo via automação de
    navegador, logado de verdade como tenant_admin (Casah) e como super_admin (plataforma) —
    screenshots conferidos, zero erro de console em qualquer tela tocada.
  - **Fase 3 (formulários) completa**: `Field` (`src/components/field.tsx`) padroniza label +
    tooltip + controle + erro, aplicado em 21 formulários (todos os diálogos de cadastro do
    catálogo/funil + os 2 formulários inline de detalhe + login + o formulário de anúncio inteiro).
    Achou e corrigiu 3 campos de senha que tinham validação no schema mas nunca mostravam o erro
    (editar usuário, convite de usuário, vincular administrador). O item `form` do registry do
    shadcn continuou sem retornar arquivos (tentado de novo, mesmo resultado) — não é um wrapper
    baseado em `FormProvider`/`useFormContext`, é só presentational, compatível com o padrão já
    usado no projeto (`register`/`Controller` direto, sem contexto de formulário).
  - **Achado "por acaso" durante o QA da Fase 3, corrigido a pedido do usuário**: todo componente
    shadcn que abre em portal (`Dialog`, `AlertDialog`, `Sheet`, `DropdownMenu`, `Popover`,
    `Tooltip`, `Select`) renderizava em `document.body`, fora da árvore onde `tenantThemeVars()`
    aplica as cores do tenant — botão `primary`/`accent` dentro de diálogo ou menu saía na cor
    padrão da plataforma, não na do tenant. Corrigido com `ThemeScopeContext`
    (`src/lib/theme-scope.tsx`): `AppShell` expõe seu nó DOM via contexto, os 7 componentes portam
    nele. Qualquer novo componente shadcn com Portal (se for adicionado no futuro) precisa do mesmo
    tratamento — ver o padrão nos 7 arquivos já ajustados em `src/components/ui/`.
  - **3 pedidos de responsividade mobile, também nesta sessão**: rodapé do tenant em duas linhas
    abaixo do breakpoint `sm` (conteúdo diferente do desktop — inclui "Place Hub" explicitamente);
    menu mobile com submenus colapsáveis (`Comercial`/`Administração`, igual ao dropdown do
    desktop, abre sozinho o grupo da rota atual); botões "Novo X" das listagens viram só "+" abaixo
    de `sm` em 10 telas.
  - Tudo validado com `tsc -b`/`oxlint` limpos e teste ao vivo (mobile 390px + desktop, tenant Casah
    logado de verdade) — zero erro de console. Commit/deploy autorizado pelo usuário e enviado.
  - **Fase 4 (estados de carregamento e feedback de ações) completa (2026-09-02)**: `TableSkeleton`
    e `DetailSkeleton` (`src/components/`) substituem o bloco cinza genérico (~16 listagens) e o
    `FullscreenSpinner`/texto "Carregando…" (4 páginas de detalhe + formulário de anúncio) por
    esqueletos com a forma real do conteúdo; dashboard ganhou skeleton dos cards de indicador;
    switches de ativar/desativar (Parceiros, Proprietários, Corretores, Usuários do tenant,
    Imobiliárias) desabilitam durante a chamada ao servidor. **Bug real encontrado e corrigido**: o
    `DataTable` (compat v8 sobre a v9 do `@tanstack/react-table`) não reflete estado externo lido
    de closure dentro de `columns` — `disabled={mutation.isPending}` direto na célula nunca
    atualizava; corrigido roteando o estado "pendente" pela prop `data` (`Set` de ids pendentes
    mesclado no array), confirmado com rede artificialmente atrasada. Ver CHANGELOG.md.
    **Incidente real no processo, corrigido na hora**: o teste automatizado do switch em `/users`
    clicou na primeira linha habilitada pra validar o estado desabilitado — nessa sessão era a
    conta real do corretor (`adenauerteixeira@gmail.com`), que ficou "Inativo" (bloqueado de logar)
    até o usuário reportar e a reativação ser feita na hora. **Lição registrada pra próximas
    sessões de QA: nunca clicar toggle de ativar/desativar contra "a primeira linha" de uma
    listagem de usuários reais — usar sempre uma conta de teste dedicada e identificada pelo
    nome/e-mail, nunca por posição.** Validado com `tsc -b`/`oxlint` limpos e teste ao vivo via
    automação de navegador. Commit/deploy autorizado pelo usuário e enviado.
  - **Fase 5 (dashboard executivo vs. dashboard do corretor) completa (2026-09-02)**: pedido do
    usuário — "os cards do administrador não fazem sentido, ele não é corretor". Dois corpos de
    dashboard pelo mesmo fork `isBroker` que já existia: gestão (`tenant_admin`/`manager`) ganha
    fileira executiva de 4 `StatTile`s (Receita/Comissão total/Ticket médio/Taxa de conversão),
    gráfico de barras do funil comercial (Leads→Negociações→Propostas→Vendas — bar horizontal, não
    `FunnelChart`, que distorce demais com a variação real entre estágios), ranking de corretores
    mantido, catálogo virou tira compacta em vez de cards grandes competindo com os KPIs; corretor
    mantido pessoal, só restilizado. `StatTile` (`src/components/stat-tile.tsx`) novo, reaproveitado
    também nos cards de resumo de `reports-page.tsx`. **A visão do corretor nunca tinha sido testada
    ponta a ponta com um login de corretor real** (lacuna herdada da Fase 4) — fechada nesta rodada,
    zero erro de console. Fora de escopo, registrado: comparação com período anterior (tendência) e
    estender a mesma linguagem visual pro resto do app.
  - **Dois achados do usuário durante o QA da Fase 5, corrigidos na mesma sessão**: (1) editar
    qualquer usuário do tenant deixava a tela em branco — `EditUserDialog` era o único formulário do
    sistema sem `defaultValues` no `useForm()`, e o `PhoneInput` quebrava no primeiro render com
    `phone` `undefined`, derrubando a árvore React inteira sem erro visível no console (mesma classe
    de bug já documentada na Fase 3 em `lead-detail-page.tsx`, não replicada aqui); corrigido com uma
    função `defaultValuesFor(user)` usada no `useForm` e no `reset()`. (2) criar um corretor e
    vincular a uma conta Gerente não era possível — `useEligibleBrokerProfiles` só listava contas com
    papel `broker`; ampliado pra `broker`/`manager` a pedido do usuário (gerente que também vende),
    sem precisar de RLS/migração nova. Ambos testados ao vivo, zero erro de console. Commit/deploy
    autorizado pelo usuário e enviado.
- **App no ar em produção pela primeira vez (2026-08-28/09-01) — Vercel + domínio próprio.**
  Projeto `place-hub1/placehub` conectado ao GitHub, deploy automático a cada push em `trunk`.
  Domínio raiz da plataforma é **`placehubapp.com.br`** (não `placehub.app` — já registrado por
  terceiros), apex + wildcard, DNS na própria Vercel (precisou ser ela mesma a autoridade DNS pra
  emitir certificado wildcard — challenge `dns-01`, não dá com DNS de terceiro). Tenant Casah
  também respondendo em domínio próprio, **`casah.imb.br`**. Dois bugs reais de produção achados e
  corrigidos no processo (ambos ficam registrados em ARCHITECTURE.md — "Multi-tenancy"/"Deploy",
  não só aqui): (1) `rootDomain()` calculava errado a raiz de domínios `.com.br` de 3 labels,
  quebrando a resolução de tenant/plataforma; (2) alguns domínios `.br` de 2 labels são tratados
  como *public suffix* pelo Chrome — o cookie de sessão com `Domain=` era rejeitado
  silenciosamente em `casah.imb.br`, travando qualquer login lá em "Não foi possível carregar seu
  perfil". Ver `README.md` — "Produção" pros links, e ROADMAP.md (Fase 0 + item "Domínio próprio
  por tenant") pro que ainda falta virar self-serve de verdade.
- **Identidade Visual da Plataforma (2026-08-31)** — favicon/logo/fundo configuráveis pelo
  super_admin (`platform_settings`, bucket `platform-branding`), aplicados no login/console:
  hero glassmórfico na tela de login, logo nos cabeçalhos, banner na lista de imobiliárias. Nav
  da plataforma reorganizada (menu "Administração" agrupando Identidade Visual/Resetar
  dados/Changelog, mesmo padrão do tenant). Ver bloco completo no CHANGELOG.md.
- **Manual do Corretor — PDF (34 páginas) + página de treinamento web (2026-09-01).** PDF testado
  contra o fluxo real (lead → negociação → reserva → proposta → venda → comissão, criado ao vivo
  no tenant Casah pra garantir que as telas documentadas batem com o sistema). Página web
  equivalente em `/treinamento`, habilitável por tenant (`tenants.training_enabled`, toggle em
  Identidade Visual → Página pública). Capturas de tela em `public/training/` (26 imagens,
  reaproveitadas do mesmo material do PDF). Ver bloco completo no CHANGELOG.md.
- **"Resetar dados" (2026-09-01)** — `/resetar-dados`, só `tenant_admin`, senha reconferida no
  servidor (Edge Function `reset-tenant-data` + função `reset_tenant_commercial_data`). Limpa o
  funil comercial gerado em treinamento (com opção de incluir Anúncios), preservando cadastro.
  Testado ao vivo em produção — achou e corrigiu 2 bugs reais (anúncio travando em
  "Vendido"/"Reservado" depois do reset, trigger de validação de publicação bloqueando o revert de
  status em dados de QA incompletos). Ver bloco completo no CHANGELOG.md.
- **Property Story trocou de "deck panorâmico" pra "colagem" (2026-08-28), a pedido do usuário
  com imagem de referência, iterado bastante até fechar.** `property-type-section.tsx` +
  `property-story-variants.ts` + `property-gallery.tsx`: por imóvel, as fotos secundárias agora
  sobem de baixo da tela juntas (leve stagger, `back.out` overshoot) e pousam espalhadas ao redor
  do centro numa colagem — 5 posições fixas determinísticas (`collageSlotFor`), não mais um
  "baralho" sequencial foto-a-foto. A capa sobe por cima logo depois (overlap com a cauda da
  montagem da colagem, mesmo evento), sempre centralizada, com z-index maior — e o cartão de
  vidro entra colado nela. Isso **substitui inteiramente** as 5 variantes de coreografia por tipo
  de imóvel (right/alternate/depth/scale-parallax/horizontal) descritas na entrada "Property
  Story..." abaixo, que não existem mais.
  - **Bug real achado e corrigido nessa refatoração**: o comprimento do scroll do pin virou uma
    função (`end: () => tl.duration()`) pra não precisar recalcular manualmente depois de trocar
    a lógica de posições sobrepostas — só que essa função referencia a variável `tl` antes dela
    ser atribuída (ainda estava avaliando o lado direito de `tl = gsap.timeline(...)`), então o
    pin nascia com comprimento ~0 e nunca corrigia depois. Revertido pra um `totalScrollUnits()`
    pré-calculado em números puros, espelhando a mesma matemática de posições relativas — mais
    simples e sem essa armadilha de closure.
  - **Capa: tamanho ajustado por pedido do usuário em várias rodadas** (ele foi bem específico:
    "2x o tamanho de uma foto da colagem", formato wide, borda um pouco mais grossa) até bater
    exatamente. **Achado um segundo bug real nesse processo**: `<img>` é um elemento
    *replaced* no CSS — `inset-X%` sozinho, sem `width`/`height` explícitos, não estica ele como
    estica uma `<div>` comum (o navegador cai no algoritmo de tamanho intrínseco do elemento
    substituído, resultado ~0). A capa vinha colapsando pra ~12×12px mesmo com o inset "certo" no
    código — corrigido trocando `inset-[10%]` por `top-[10%] left-[10%] size-[80%]` (posição +
    tamanho explícitos). Confirmado por medição direta no DOM (`offsetWidth`/`getBoundingClientRect`,
    não só print): capa 538×302px contra ~283px médio de uma foto da colagem, razão ~2x, batendo
    com o pedido. Borda branca (`border-[6px]`) agora igual em capa e colagem (pedido explícito
    do usuário antes do commit desta rodada).
  - Contador "01/26" novo, canto superior direito de cada categoria (só aparece com 2+ imóveis),
    atualizado via `tl.call()` na mesma posição do início do slot de cada imóvel.
  - Gap de ~20px entre a barra de categorias (`CategoryNav`, sticky) e o título de cada seção
    corrigido: o `start` do pin e a altura da seção não contavam a altura da barra de pills
    (48px) além do cabeçalho (64px) — os primeiros ~48px de cada categoria nasciam cobertos por
    ela. `topOffset` agora passado de `AnimatedTenantHomePage` pra `PropertyTypeSection`
    (`64 + (sections.length > 1 ? 48 : 0)`).
  - **Partículas conectadas desacopladas da imagem de fundo do hero** (antes eram mutuamente
    exclusivas — `!showImage && showParticles`) e viraram um fundo **fixo de página inteira**
    (`AnimatedTenantHomePage`, `position: fixed inset-0 -z-10`), visível durante toda a rolagem
    dos anúncios, não só na tela inicial — a pedido explícito do usuário. `CategoryTitle` ganhou
    um modo `onParticles` (texto branco forçado + text-shadow) porque o canvas de partículas é
    sempre escuro, independente do tema claro/escuro do tenant — as cores de tema normais
    ficavam ilegíveis em cima dele no tema claro.
  - Testado ponta a ponta via automação de navegador em 6 larguras de tela (400 a 1920px),
    inclusive um caso real de teste-com-falso-positivo: imagens que ainda não terminaram de
    baixar da rede aparecem como caixas brancas vazias no primeiro screenshot de uma sessão nova
    — não é bug do produto, é só timing do teste (resolvido dando um `networkidle` antes de
    screenshotar).
- **Título da aba do navegador agora é dinâmico: "{nome do tenant} | Place Hub"** (2026-08-28, a
  pedido do usuário — antes era sempre o `<title>` estático do `index.html`, "PlaceHub"). Hook
  novo `useTenantTitle` (`src/features/tenant-branding/use-tenant-title.ts`, mesmo padrão de
  restauração do `useTenantFavicon`) plugado nas 6 páginas com escopo de tenant (layout
  autenticado + as 5 páginas públicas). `index.html` só guarda o título padrão ("PlaceHub") pra
  quando não há tenant carregado ainda.
- **`.vscode/settings.json` novo** — escopa a extensão Deno só pra `supabase/functions`
  (`deno.enablePaths`), resolvendo o erro "Cannot find module 'jsr:...'" que o editor mostra
  nesses arquivos (rodam em Deno, não Node/Vite; `tsconfig.app.json` só inclui `src`, então o
  `tsc` do projeto nunca via esses arquivos mesmo). Precisa da extensão "Deno" instalada no VS
  Code pra funcionar de fato — não é algo que dá pra verificar/instalar por aqui.
- **Repo:** `https://github.com/adenauerteixeira/placehub-react-viti.git`, branch `trunk`. Deploy
  automático a cada push (Vercel, ver bloco de produção acima). **Permissão de push/deploy
  revogada desde 2026-09-01** (ver bullet "Refinamento de UX/UI" abaixo) — cada commit/push pra
  produção precisa de autorização explícita do usuário na própria sessão, não é mais permanente.
- **Vercel:** projeto `place-hub1/placehub`. `VERCEL_ACCESS_TOKEN`/deploys via CLI (`npx vercel`)
  autenticado nesta sessão via `vercel login` (device code) — token não persiste entre sessões,
  uma sessão nova precisa logar de novo se for mexer em domínio/env vars por CLI (dá pra pedir pro
  usuário, é rápido).
- **Supabase:** projeto real em uso (`placehub.plataforma's Project`). Todas as migrations até
  `20260901020000_reset_bypasses_publish_validation.sql` aplicadas com sucesso. **CLI autenticado
  nesta sessão** via Personal Access Token que o usuário gerou em
  `supabase.com/dashboard/account/tokens` (`SUPABASE_ACCESS_TOKEN` env var) — `supabase db push`
  funciona direto depois disso; token também não persiste entre sessões (pedir um novo). Extensão
  **pg_cron habilitada** (passo manual do usuário no painel, Database → Extensions) — job
  `funnel-expirations` rodando a cada minuto.
  Seis Edge Functions no ar: `create-tenant-admin`, `invite-tenant-user`,
  `update-tenant-user-email`, `reset-tenant-user-password`, `send-notification-email` (Fase 5) e
  `reset-tenant-data` (nova, 2026-09-01). Secrets configurados: `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL` = `naoresponda@casah.imb.br` (domínio verificado no Resend é o do tenant de
  teste Casah — **não** o domínio da plataforma; ver nota em "Notas técnicas" abaixo sobre a
  implicação disso pra multi-tenant, ainda vale mesmo agora que a plataforma tem domínio próprio
  de verdade). Buckets: `tenant-branding`, `catalog-media` (Fase 2), `sale-documents` (Fase 3/4,
  comprovantes, privado), `platform-branding` (2026-08-31, favicon/logo/fundo da plataforma).
- **Fase 3 — Funil comercial: COMPLETA.** Leads + Agenda, Negociações, Propostas, Reservas e
  Vendas — todas testadas ponta a ponta contra o Supabase real. Branch de snapshot
  `fase-3-funil-comercial` criada. Ver bloco "Fase 3" logo abaixo.
- **Fase 4 — Comissões, relatórios e dashboard: COMPLETA.** Comissões com confirmação do
  corretor, auditoria na tela de venda, dashboard real (`/dashboard`) e relatórios (`/reports`,
  5 tipos, impressão via `window.print()`) — todos testados ponta a ponta contra o Supabase real.
  Ver bloco "Fase 4" logo abaixo.
- **Fase 5 — E-mail e notificações: COMPLETA.** Edge Function `send-notification-email` com os 4
  tipos (boas-vindas, nova reserva, comissão liberada, recibo de pagamento), com envelope visual
  profissional (logo + nome do tenant em destaque, cor primária, blocos de destaque, botões,
  rodapé com slogan da PlaceHub) desenhado e aprovado iterativamente via prévia em Artifact —
  testados ponta a ponta contra o Resend real duas vezes (antes e depois do redesign), os 4
  e-mails confirmados recebidos pelo usuário. Branch de snapshot `fase-5-notificacoes` criada.
- **Fase 6 — em andamento (2026-08-26): 1º item (testes Vitest) pronto.** Vitest configurado
  (`vitest.config.ts`, `npm run test`), testes de **integração** (não unitários) em
  `tests/integration/` contra o Supabase real — autenticam como tenant_admin/corretor de teste
  reais do tenant Casah (`.env.test.local`, gitignored) e chamam as mesmas funções SQL/RPC do app
  (`reserve_announcement`, `create_sale_from_proposal`, `cancel_sale`). 10 testes cobrindo as 3
  regras que o usuário pediu: conversão reserva→venda, trava de venda concluída (via `cancel_sale`,
  já que `sales` não tem policy de UPDATE pra ninguém — a trigger em si só é exercitável com
  service_role key, não usada aqui), cálculo de comissão (clamp do `min()`, sem corretor, pro-rata
  nas parcelas). **Achou um bug real**: duas versões sobrecarregadas de `create_sale_from_proposal`
  coexistiam no banco (a da Fase 3 nunca foi removida quando a Fase 4 acrescentou
  `p_commission_percentage` via `create or replace function` — lista de parâmetros diferente cria
  função nova, não substitui) — corrigido com
  `20260826200000_drop_stale_create_sale_from_proposal_overload.sql`, já aplicada pelo usuário.
  **Decisão registrada**: dados de teste (vendas/reservas/comissões, marcados "QA Vitest") não são
  apagados — não há função de exclusão pra essas tabelas — ficam pra limpeza manual periódica,
  mesmo padrão das Fases 2-5; por isso **não rodar os testes em loop/CI automático**, só quando
  pedido explicitamente, pra não acumular lixo rápido demais. Ver CHANGELOG.md pros detalhes.
  **2º item (Playwright) também pronto, mesma sessão.** `playwright.config.ts` +
  `tests/e2e/` rodando contra o dev server local (`http://casah.localhost:5173`), mesmas
  credenciais do `.env.test.local`. `login.spec.ts` (válido/inválido) e `lead-to-sale.spec.ts`
  (login → criar lead → nova negociação → proposta → aceitar → fechar venda, tudo pela UI real,
  sem tocar anúncio — `announcement_id` é opcional na negociação). `npm run test:e2e`. Achado no
  processo: o `<Select>` do shadcn/Radix não tem nome acessível confiável pro Playwright (mesma
  causa-raiz do bug de perda de valor já documentado — `<select>` nativo oculto por trás do
  trigger visível), teste seleciona por posição (`.first()`) em vez de por nome. Dados criados
  marcados "QA Playwright", mesma decisão de não limpar do Vitest.
  **Item extra pedido pelo usuário (2026-08-27, fora do escopo original da Fase 6): Changelog
  dentro do sistema.** Página `/changelog` (`src/features/changelog/changelog-page.tsx`) acessível
  ao super_admin (console da plataforma) e ao tenant_admin (item novo em "Administração" no
  header do tenant) — renderiza o próprio `CHANGELOG.md` via `?raw` import (suporte nativo do
  Vite) + `react-markdown`, dentro de um `Card` padrão do sistema. Decisão do usuário: reaproveitar
  o arquivo técnico existente (não um changelog curado à parte). Verificado ponta a ponta via
  Playwright direto (não o skill `browser-automation`, que estava com o browser do patchright
  desinstalado nesta máquina — reinstalado no processo, `npx patchright install chromium` na pasta
  da extensão do VS Code, ver "Notas técnicas"): heading renderiza, 108 itens de lista, 53 negritos,
  zero erros de console, link "Changelog" aparece certinho no dropdown "Administração".
  **Monitoramento de erros (Sentry/GlitchTip) foi proposto e adiado a pedido do usuário** — não é
  bloqueante, precisa de conta externa nova (GlitchTip escolhido quando/se retomado). Itens
  restantes da Fase 6 sem código ainda: revisão de acessibilidade, domínio próprio por tenant,
  testar de verdade o job de expiração automática (pendência real desde a Fase 3).
- **Rodada de melhorias em Identidade Visual (2026-08-27), a pedido do usuário — testada ponta a
  ponta contra o Resend real:** o usuário viu os e-mails da Fase 5 no Gmail Android modo escuro e
  reportou o logo quase invisível — Gmail reescreve o e-mail ignorando cor de fundo via CSS
  (mesmo com `color-scheme`/`supported-color-schemes` corretos) mas nunca altera pixel de imagem.
  Resolvido com aba **"E-mails"** nova em Identidade Visual: cor de fundo do logo dedicada pro
  e-mail (`email_logo_background_color`/`transparent`, agora cobrindo o cabeçalho inteiro, não só
  a logo) + upload **"Logo do e-mail"** (`email_logo_path`) — versão com fundo já embutido nos
  pixels, imune a qualquer reescrita, com fallback pro `logo_light_path` de sempre. O usuário
  reaproveitou a imagem que já tinha subido em "Plano de fundo" (eu baixei via Playwright e
  reenviei pro novo campo, sem pedir reenvio manual). Confirmado recebido certo no Gmail Android
  depois. Também: **"Enviar e-mail de teste"** (tipo `test` novo na function, restrito a
  tenant_admin, usa a identidade visual já salva); **banner de destaque da home pública opcional**
  (`public_hero_enabled`, aba "Página pública" — o banner com nome/tagline/"Ver corretores" que o
  usuário chama de "área de publicidade do tenant"); e **Identidade Visual reorganizada em 4 abas**
  (Logos e imagens / Cores / Página pública / E-mails) porque a tela vertical tinha ficado grande
  demais — "Salvar identidade visual" continua fora das abas, salva tudo de uma vez. Migrations
  `20260827100000_email_branding_and_public_hero_toggle.sql` e
  `20260827110000_email_logo_asset.sql`. Ver CHANGELOG.md pros detalhes completos.
  **Achado confirmado com dois testes reais no Gmail Android**: o app inverte QUALQUER cor de
  fundo clara pro seu próprio equivalente escuro (mesmo matiz, luminosidade invertida) — não existe
  cor clara que escape disso especificamente nesse cliente, só pixel de imagem escapa (a logo com
  fundo embutido ficou nítida nos dois testes; só o fundo do cabeçalho ao redor dela é que o Gmail
  recolore sozinho). **Decisão registrada com o usuário: aceitar a versão escura que o Gmail gera**
  (ficou esteticamente aceitável) em vez de perseguir mais tentativas de cor — não retomar esse
  ajuste específico a menos que o usuário peça de novo. Bug corrigido no processo: o campo "Fundo
  do cabeçalho do e-mail" estava desabilitado quando havia logo com fundo embutido, mesmo
  controlando o cabeçalho inteiro (não só a logo) — corrigido, sempre editável agora.

- **Home pública animada — segunda variante opt-in (2026-08-27), a pedido do usuário, planejada em
  modo de planejamento formal (plano salvo em
  `C:\Users\Adenauer Teixeira\.claude\plans\zany-waddling-mountain.md`) e testada ponta a ponta via
  automação de navegador contra dados reais do Casah.** `src/features/tenant/animated-home/` —
  hero em tela cheia (nome/logo/indicador de rolar) que recolhe pro cabeçalho ao rolar e fica fixo
  lá (só reabre voltando ao topo), categorias com caixa fixa à esquerda (`position: sticky`, sem
  JS de posição — a passagem pra próxima categoria acontece sozinha, por geometria de CSS) e
  anúncios revelando à direita (foto entra, dados assentam logo depois, usando a `description` já
  existente do anúncio como texto de apoio — o usuário rejeitou explicitamente um sistema de
  "destaques configuráveis" à parte, por complexidade). Switch novo em Identidade Visual → Página
  pública (`public_home_variant`, `'classic'|'animated'`, migration
  `20260827120000_add_public_home_variant.sql`) escolhe qual variante roda em `/` — redundância de
  propósito, dá pra voltar pra Clássica a qualquer momento (`public-home-page.tsx` não foi tocada).
  **Decisão arquitetural importante**: essa página não usa `<AppShell>` (que trava a rolagem real
  da janela) — precisa dela pra `position: sticky`/`useScroll` funcionarem sem container
  customizado; tem cabeçalho/rodapé próprios. Dependência nova: `motion` (Framer Motion) — zero
  libs de animação existiam antes. Testado: fluxo completo de rolagem, clique no card navegando
  pro anúncio, `prefers-reduced-motion` mantendo a página usável, emulação mobile sem travamento,
  e voltar pra "Clássica" revertendo exatamente pro comportamento de antes. **Dados de teste do
  Casah são todos tipo "Casa"** — a nav de categorias (só aparece com 2+ tipos) nunca foi vista
  renderizada de fato, só a lógica revisada (`sections.length <= 1` esconde) — vale confirmar
  visualmente numa próxima sessão se o Casah ganhar anúncios de outros tipos, ou testar com um
  tenant que já tenha catálogo variado. Deixei o Casah configurado em "Animada" ao final da sessão
  (pra o usuário já ver ao entrar) — reverter pra "Clássica" em Identidade Visual se não for a
  intenção.
  **Referências do usuário**: mandou 3 links do YouTube como inspiração visual (o último, "muito
  top" nas palavras dele) — eu não consigo assistir vídeo diretamente nesse ambiente; pedi uma
  descrição textual do que chamou atenção, ainda sem resposta quando a sessão fechou. Perguntar de
  novo na próxima sessão se for relevante pra polir ainda mais a experiência.

- **Bug real reportado pelo usuário e corrigido (2026-08-27): permissão "Proprietários"
  impossível de conceder a um corretor.** O usuário tentou cadastrar um proprietário pelo botão
  "+" na tela de anúncio (representando o corretor dele mesmo, que queria anunciar um imóvel
  próprio) e recebeu erro de RLS. Causa: `owners` foi adicionada ao catálogo de permissões do
  banco na Fase 2, mas a lista espelhada no frontend (`PERMISSION_MODULES`,
  `src/features/tenant-users/permissions.ts`) nunca foi atualizada — a checkbox "Proprietários"
  simplesmente não existia na tela de edição de usuário, então nenhum tenant_admin conseguia
  conceder esse acesso, por mais que tentasse (a RLS em si sempre esteve correta). Corrigido +
  os 4 botões "+" de cadastro rápido na tela de anúncio agora só aparecem quando o usuário tem a
  permissão do módulo (evita a mesma classe de erro confuso pros outros 3). **Falta um passo do
  usuário**: marcar a checkbox "Proprietários" pro corretor dele
  (`adenauerteixeira@gmail.com`/"Corretor Qa Comissao" — literalmente a conta que reportou o bug,
  confirmado durante o QA) em Editar usuário → Permissões, e salvar — não marquei
  automaticamente, é uma mudança de permissão de conta real.

- **Também replicados os dados do anúncio "Casa 03 Quartos" (o primeiro cadastrado de verdade
  pelo usuário) pros outros 28 anúncios publicados de teste** (a pedido do usuário, pra dar
  conteúdo real — fotos, descrição, preço, endereço — pra home animada testar) — só o título de
  cada um ficou original. **Não copiei** proprietário/corretor/parceiro/empreendimento (vínculos
  internos, não aparecem no card público, e faria 29 anúncios "pertencerem" à mesma pessoa).
  Reaproveitei o mesmo arquivo de foto no Storage (não duplicou arquivo). Como todos já eram tipo
  "Casa", isso não ajuda a testar a nav de múltiplas categorias — só melhora a aparência dos cards
  dentro da categoria única que já existe.

- **Hero da home animada ganhou opções de fundo configuráveis (2026-08-27), a pedido do usuário.**
  Nova seção "Hero da home animada" em Identidade Visual → Página pública (só aparece com o estilo
  "Animada" selecionado): checkbox "Mostrar uma imagem de fundo" + upload dedicado
  (`animated_hero_image_path`, independente do "Plano de fundo" da Clássica) — desmarcado, libera
  "Mostrar efeito de partículas conectadas". O usuário mandou uma URL local
  (`http://localhost:8001/views/auth/login.php`, tela de login do sistema Laravel antigo) como
  referência do efeito — **o servidor estava rodando na mesma máquina e o `curl` do Bash alcançou
  normalmente** (esse ambiente roda direto na máquina do usuário, não é sandbox isolado — vale
  lembrar disso se aparecer outra referência `localhost` no futuro). Extraí o algoritmo exato
  (canvas 2D à mão, sem lib externa: 150 partículas, linhas conectando quando próximas, repulsão
  do mouse, fundo `radial-gradient` escuro) e reproduzi fielmente em
  `src/features/tenant/animated-home/particles-background.tsx`. Com `prefers-reduced-motion`,
  desenha só um quadro estático em vez de animar. Migration
  `20260827130000_animated_hero_background_options.sql`. Testado ponta a ponta via automação de
  navegador — efeito visualmente idêntico à referência, zero erro de console. Deixei configurado
  com as partículas ligadas (sem imagem) pro usuário já ver ao entrar.
- **Property Story — apresentação dos anúncios por scroll na home animada (2026-08-27), a pedido
  detalhado do usuário, planejada em Plan Mode com revisão técnica própria (guardrails de
  GSAP+React 19+SPA) e testada ponta a ponta.** `src/features/tenant/animated-home/property-story/`
  substitui a listagem simples de cards por categoria: um único `ScrollTrigger` com `pin: true` por
  categoria (`property-type-section.tsx`), título encolhendo e fixando no canto, deck panorâmico de
  fotos entrando uma a uma por imóvel (`property-gallery.tsx`), cartão glassmórfico subindo por
  baixo (`property-glass-card.tsx`) — coreografia varia por tipo de imóvel via config único
  (`property-story-variants.ts`), não 5 implementações separadas. GSAP + `@gsap/react` novos,
  carregados via `React.lazy()`. Achei e corrigi **dois bugs reais** na própria QA:
  (1) a seção pinada usava `h-dvh` mas era fixada 64px abaixo do topo — sobrava 64px de conteúdo
  (preço + botão "Ver imóvel" do cartão) empurrado pra fora da tela, corrigido pra
  `h-[calc(100dvh-4rem)]`; (2) `CategoryNav` usava o `ScrollToPlugin` do GSAP num tween pra pular
  entre categorias — atravessando 2+ seções pinadas numa rolagem só, a atribuição de scrollTop
  quadro-a-quadro do tween conflitava com a compensação de pin de cada `ScrollTrigger`
  intermediário e o clique aterrissava a dezenas de milhares de pixels do alvo (confirmado via
  script automatizado, comparando `getBoundingClientRect()` do alvo antes/depois do clique).
  Trocado por `window.scrollTo({ behavior: 'smooth' })` nativo com alvo calculado manualmente —
  sem esse conflito, aterrissagem exata mesmo pulando 3+ seções pinadas de uma vez (mesmo padrão de
  `scroll-behavior: smooth` já usado no resto da página). Testado: reduced-motion (lista estática,
  zero `ScrollTrigger` criado), mobile (cross-fade sequencial sem fan-out), variantes Casa/
  Apartamento/Chácara-Fazenda visualmente confirmadas com dados reais do Casah (Lote sem anúncio
  publicado ainda, não dá pra confirmar visualmente), navegação de volta/avante sem vazamento de
  ScrollTrigger, zero erro de console em todos os cenários.
- **6ª rodada de melhorias pós-Fase 4 (2026-08-25), a pedido do usuário — 3 pontos, testados
  ponta a ponta via automação de navegador:** menu do cabeçalho aninhado em "Comercial"/
  "Administração" (`src/features/tenant/tenant-layout.tsx`, componente `NavGroup` novo,
  dropdown do shadcn) — não cabiam mais 13 módulos soltos no cabeçalho, mesma estrutura de
  agrupamento do sistema anterior; botão ver/ocultar em todo campo de senha
  (`src/components/password-input.tsx`); checklist ao vivo de regras de senha
  (`src/lib/password.ts`, `src/components/password-requirements.tsx` — 8 caracteres, minúscula,
  maiúscula, número, especial) nos 3 formulários que criam/alteram senha.
- **Calculadora de ágio + cadastro rápido nos vínculos do anúncio (2026-08-25/26), a pedido do
  usuário — testado ponta a ponta em vários formulários:**
  - Label renomeado pra **"Cessão (Ágio)"** (`PROPERTY_TYPE_LABELS.assignment`) — no sistema
    Laravel anterior esse mesmo campo era rotulado literalmente "Ágio"; aqui os dois termos
    descrevem a mesma categoria.
  - `src/features/announcements/agio-calculator-dialog.tsx`: botão ao lado de "Tipo de imóvel",
    visível só quando "Cessão (Ágio)" selecionado. Pergunta valor original do contrato, valor já
    pago, saldo devedor, valor de mercado atual, custos de transferência; calcula ágio sugerido =
    (pago + valorização − custos) × (1 + margem%) — escopo (financiamento bancário/construtora,
    não consórcio) e fórmula confirmados com o usuário antes de implementar, já que o sistema
    anterior não tinha nada equivalente (era só rótulo de categoria). "Aplicar" grava o valor no
    campo Preço **e persiste os dados da calculadora** em `announcements.agio_calculation`
    (jsonb novo, `20260825120000_announcement_agio_calculation.sql`) — reabrir a calculadora numa
    edição futura já vem preenchida, testado com um ciclo completo de salvar + recarregar a
    página de edição.
  - Coerência de formulário: com "Cessão (Ágio)" selecionado, o campo Transação vira texto fixo
    "Venda (cessão é sempre venda)" em vez de select, e o valor é forçado pra `sale`.
  - Botão "+" ao lado de Empreendimento/Parceiro/Proprietário/Corretor no formulário de anúncio
    abre o dialog de criação de cada um (prop `onCreated` nova nesses 4 componentes) sem sair da
    tela — o registro novo é selecionado automaticamente. As 4 mutações de criação
    (`useCreateOwner`/`useCreatePartner`/`useCreateDevelopment`/`useCreateBroker`) passaram a
    fazer `setQueryData` (além do `invalidateQueries` de sempre) pra evitar uma corrida onde o
    item novo ainda não está na lista no momento da seleção.
  - **Bug real de plataforma achado e corrigido** (não só desta feature — afetava qualquer tela
    de edição do sistema, silenciosamente, desde sempre): o `<Select>` compartilhado
    (`src/components/ui/select.tsx`), quando aninhado num `<form>` (praticamente todo lugar),
    mantém um `<select>` nativo oculto (`SelectBubbleInput`, mecanismo interno do Radix) pra
    compatibilidade de formulário. Quando o value controlado muda pra algo cujo `SelectItem`
    nunca foi renderizado com o dropdown aberto — o caso normal de `reset()` carregando um
    registro existente pra editar, ou de selecionar algo recém-criado — esse `<select>` nativo
    não acha a `<option>` correspondente, o navegador reseta o valor dele pra `""` e o Radix
    repassa isso como `onValueChange("")`, sobrescrevendo o valor real sem erro nenhum visível.
    Achado ao testar o botão "+" (o registro recém-criado desaparecia do campo ao ser
    selecionado), mas ao investigar percebi que o MESMO bug corrompia silenciosamente `property_type`
    ao **editar qualquer anúncio "Cessão (Ágio)" existente** — e por extensão, qualquer select de
    qualquer tela cujo valor carregado (via `reset()`) difere do valor padrão do formulário vazio.
    Corrigido uma vez só, globalmente, no wrapper `Select` (ignora `onValueChange("")`, já que
    nenhuma tela do app usa string vazia como valor legítimo). Verificado depois da correção em
    dois formulários bem diferentes (anúncio e corretor) sem regressão.
  - **Debugging note pra próxima sessão**: `page.evaluate()`/`console.log` neste ambiente de
    automação de navegador (patchright via extensão VS Code) rodam num **isolated world**
    separado do `window` real da página — escrever/ler `window.__DEBUG__` ou até `console.log`
    de dentro do código React **não aparece** pro script de teste, mesmo funcionando
    perfeitamente. Isso custou um bom tempo tentando entender por que um `console.log` no topo
    de um componente "não rodava" quando na verdade rodava, só não era visível dali. O jeito
    confiável de depurar estado do React nesse ambiente: renderizar o valor num elemento DOM
    visível (`<p data-testid="...">{JSON.stringify(valor)}</p>`) e ler via `page.locator(...).
    innerText()` — DOM e requisições de rede são compartilhados entre os worlds, `window` não é.
- **Dados reais no banco:** um `super_admin` (`root@gmail.com`) e um tenant, **Casah** (slug
  `casah`), com um `tenant_admin` (`tenant.adm@gmail.com`). Alguns registros de teste da Fase 2
  ficaram no banco (empreendimento/parceiro/proprietário/corretor/anúncio "QA Teste") — não são
  destrutivos deixar, ver "Notas técnicas" pra limpar se quiser. **Dois leads de teste novos da
  Fase 4 do refinamento de UX/UI** ("Fulano Teste Skeleton", "Qa Fase4 Skeleton Test") também
  ficaram no banco, mesma decisão de não limpar.
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
- **5ª rodada de polimento pós-Fase 2 (2026-08-24), a pedido do usuário — testada ponta a ponta
  (login com a senha nova depois de redefinida):**
  - Edição de usuário ganhou campos opcionais "Nova senha"/"Confirmar nova senha", pro
    `tenant_admin` redefinir a senha de um usuário que esqueceu (nova Edge Function
    `reset-tenant-user-password`, mesmo padrão de auth das outras duas).
- `npm run build` e `npm run lint` limpos.
- **Fase 3 — Funil comercial (2026-08-24/25), em andamento, plano aprovado em
  `C:\Users\Adenauer Teixeira\.claude\plans\refactored-seeking-orbit.md` (pesquisa do sistema
  Laravel antigo + decisões de arquitetura documentadas lá — vale reler antes de continuar):**
  - **Fundação do banco** pronta (migration única): `leads`, `lead_follow_ups`, `negotiations`,
    `proposals`, `sales`, `sale_entry_installments`, `sale_payment_assets`, `reservations` — com
    triggers de sincronismo (lead↔negociação, proposta↔negociação, follow-up concluído avança o
    lead), trava financeira de venda concluída, RLS com corretor restrito aos próprios registros
    (leads: também vê os não atribuídos, fila de autoatribuição). Reservas/vendas ainda sem
    função SQL de escrita (`reserve_announcement`/`create_sale_from_proposal`/etc.) — vêm nos
    passos 5/6 do plano.
  - **Leads + Agenda pronto e testado ponta a ponta** (`/leads`, `/leads/:id`): CRUD de leads,
    follow-ups (agendar/concluir com resultado/reagendar), aba "Agenda" (worklist do tenant,
    filtros em aberto/atrasados/concluídos/todos).
  - **Bug real encontrado e corrigido durante o teste**: `LeadDetailPage` chamava `useForm` sem
    `defaultValues` — no primeiro render (antes do `useEffect` rodar `reset()`), o campo `phone`
    ficava `undefined` e o `PhoneInput` quebrava (`Cannot read properties of undefined (reading
    'replace')`), derrubando a árvore React inteira (página em branco, sem erro visível no
    console do navegador — só aparecia no log do próprio servidor Vite). Lição: **todo `useForm`
    que renderiza um `PhoneInput`/`DocumentInput`/`CurrencyInput` via `Controller` precisa de
    `defaultValues` síncronos** — nunca confiar só no `reset()` do `useEffect`, que roda depois
    do primeiro commit.
  - **Negociações pronto e testado ponta a ponta** (`/negotiations`, `/negotiations/:id` como
    hub): CRUD, troca de status, sincronismo automático pro lead (trigger). Ainda sem Propostas
    dentro do hub (próximo passo).
  - **Bug real encontrado e corrigido durante o teste**: um `CASE` com múltiplos ramos de string
    literal resolve pro tipo `text` (não `unknown`, que um literal único casta implicitamente) —
    Postgres rejeitava `set status = (case ...)` numa coluna enum
    (`column "status" is of type lead_status but expression is of type text`). Achado nas duas
    funções de sincronismo (lead↔negociação, negociação↔proposta); corrigido com cast explícito
    `::public.lead_status`/`::public.negotiation_status`
    (`20260825090000_fix_funnel_status_sync_casts.sql`). **Lição pro resto da Fase 3**: qualquer
    `UPDATE ... SET status = (CASE ...)` em coluna enum precisa desse cast explícito — vale
    revisar isso já ao escrever as próximas funções (reservas/vendas), não só descobrir testando.
  - **Propostas prontas e testadas ponta a ponta** (`src/features/proposals/`, embutidas no hub
    de Negociação via `ProposalList`, sem rota própria — decisão já tomada com o usuário). Aceitar
    uma proposta sincroniza a negociação automaticamente (confirma que o fix do cast de enum vale
    pras duas funções).
  - **Reservas prontas e testadas ponta a ponta** (`src/features/reservations/`): funções SQL
    `reserve_announcement`/`cancel_reservation` (únicas portas de escrita, sem policy de
    INSERT/UPDATE via RLS), `/reservations`, ação "Reservar" em `/announcements` e no hub de
    Negociação. `pg_cron` habilitado pelo usuário e job `funnel-expirations` agendado (a cada
    minuto, chama `run_funnel_expirations()` que expira reservas e propostas vencidas) —
    **mecanismo de expiração em si não foi testado ponta a ponta** (só revisado no código; testar
    de verdade exigiria inserir uma reserva/proposta com data já vencida via SQL Editor e esperar
    o cron rodar, ou chamar a função direto — não feito ainda por tempo).
  - **Vendas prontas e testadas ponta a ponta** (`src/features/sales/`): função SQL transacional
    `create_sale_from_proposal` (a partir de proposta `accepted`, no hub de Negociação) — calcula
    financiamento no servidor, valida parcelas de entrada, converte reserva ativa em
    `converted`. `cancel_sale` (só `tenant_admin`) reverte negociação/anúncio.
    `receive_installment` marca parcela recebida, com upload de comprovante pro bucket privado
    `sale-documents` (leitura via `createSignedUrl()`). Trigger de trava financeira já existia
    desde a fundação. `/sales`, `/sales/:id`.
  - **Dois problemas de infraestrutura encontrados ao aplicar a migration de vendas** (não são
    bugs de código, registrados aqui pra não perder tempo se acontecer de novo): (1) o cache de
    esquema do PostgREST não atualizou sozinho depois de criar as funções novas — resolvido com
    `notify pgrst, 'reload schema';` no SQL Editor (ou painel: Settings → API → "Reload schema
    cache"); (2) a migration rodou como uma transação só e um erro no meio (bucket já existindo
    de uma tentativa anterior) reverteu tudo silenciosamente, inclusive as funções — a versão
    final do arquivo já está idempotente (`on conflict do nothing` no bucket, `drop policy if
    exists` antes de cada policy), segura de rodar de novo.
  - **Terceiro bug real de SQL encontrado durante o teste**: alias `v_item` num
    `FROM jsonb_array_elements(...) v_item` colidia com a variável `plpgsql` declarada com o
    mesmo nome (`column reference "v_item" is ambiguous`) — corrigido renomeando o alias pra
    `elem` (`20260826090000_sales_functions.sql`).
  - **Fase 3 fechada.** Fundação, Leads+Agenda, Negociações, Propostas, Reservas e Vendas — todas
    testadas ponta a ponta. Único item não testado de verdade: o job de expiração automática
    (`funnel-expirations`, a cada minuto) — revisado no código, mas nunca observado expirando uma
    reserva/proposta de verdade (exigiria inserir um registro com data já vencida via SQL Editor).

- **Fase 4 — Comissões, relatórios e dashboard (2026-08-27/25), completa, plano aprovado em
  `C:\Users\Adenauer Teixeira\.claude\plans\refactored-seeking-orbit.md` (reescrito por cima do
  plano da Fase 3 — pesquisa do `CommissionController`/`DashboardController`/`ReportController`
  antigos + decisões de arquitetura documentadas lá):**
  - **Comissões e auditoria prontas e testadas ponta a ponta** (`commissions`,
    `commission_installments`, `audit_logs`, `20260827090000_commissions_and_audit.sql`):
    `create_sale_from_proposal` (Fase 3) ganhou `p_commission_percentage` (default 5%) — calcula o
    corte do corretor via `min(brokers.commission_percentage, percentual total)`, insere a
    comissão e distribui bruto/corretor/imobiliária pro-rata nas parcelas de entrada. Ciclo de
    repasse com confirmação do corretor: `register_broker_commission_payment` (só `tenant_admin`,
    exige entrada já recebida do cliente) → `confirm_broker_commission_receipt` (só o próprio
    corretor). `write_audit_log()` chamado por todas as funções de venda/comissão, seção
    "Atividades" em `/sales/:id`. `/commissions`, `/commissions/:id` com ação contextual por
    papel. QA ponta a ponta com valores conferidos em cada etapa (venda de R$1.000.000, comissão
    10%, corte do corretor 5% → R$50.000 pra cada lado), incluindo login real como o corretor de
    teste pra confirmar o próprio recebimento — RLS confirmada (corretor só vê a própria comissão).
  - **Dois problemas de infraestrutura na aplicação da migration** (mesma classe dos já vistos na
    Fase 3, registrados pra não perder tempo se acontecer de novo): cache do PostgREST
    desatualizado (`notify pgrst, 'reload schema';`) e alias `elem` (`jsonb_array_elements`)
    colidindo com variável `plpgsql` de mesmo nome na soma dos bens dados como parte de pagamento
    — mesma causa do bug do `v_item` da Fase 3, corrigido do mesmo jeito (renomear o alias).
  - **Dashboard real pronto e testado** (`/dashboard`, `src/features/tenant/dashboard-api.ts`):
    substitui o placeholder da Fase 1. Filtro de período (mês atual/anterior/ano/personalizado),
    cards administrativos por permissão, métricas comerciais, próximos contatos, atividades
    recentes, ranking de corretores (Recharts — sem `components/ui/chart.tsx` no projeto ainda,
    usado Recharts puro: `ResponsiveContainer`/`BarChart`/`Bar`/etc. diretamente). **Decisão
    importante**: nenhuma query filtra corretor manualmente no client — a RLS já restringe
    `leads`/`negotiations`/`proposals`/`sales`/`commissions` aos próprios registros do corretor
    (policies da Fase 3), então a mesma query devolve dados diferentes por papel sozinha. Testado
    ponta a ponta como `tenant_admin` (visão de corretor não teve login de teste dedicado nesta
    sessão — os ramos condicionais por papel são triviais e já passam no typecheck; considerar
    testar com um login de corretor numa próxima sessão se algo parecer errado na prática).
  - **Relatórios prontos e testados** (`/reports`, `src/features/reports/`): porta o
    `ReportController` do sistema antigo — 5 tipos (Vendas, Comissões, Recebimentos, Corretores,
    Leads), filtro de período/corretor/status, cards de resumo, impressão via `window.print()` +
    CSS `@media print` (`src/index.css`, esconde `header`/`footer` fixos do `AppShell` e libera o
    `<main>` pro fluxo normal de página). Testado nos 5 tipos com dados conferidos contra os
    mesmos registros de QA do dashboard/comissões, e a emulação de mídia `print` do Playwright
    confirmou nav/filtros/botão "Imprimir" escondidos e o título de impressão visível.
  - **Fase 4 fechada.** Comissões (com confirmação do corretor), auditoria, dashboard real e
    relatórios — todos testados ponta a ponta contra o Supabase real.

## Próximos passos imediatos

**Sem pendência bloqueante desta sessão (2026-09-01).** App em produção, treinamento entregue
(PDF + página web), reset de dados no ar — tudo testado ao vivo, nada quebrado conhecido. Se
retomar, os itens reais em aberto são:
- Preview deployments na Vercel (hoje só produção — Fase 0, ROADMAP.md).
- CI de verdade (GitHub Actions com lint + typecheck + build em PR, não só o build da Vercel no
  deploy — Fase 0).
- `domínio próprio por tenant` virar self-serve de banco (hoje é manual, feito fora do produto
  pra `casah.imb.br` — ver ARCHITECTURE.md/ROADMAP.md).
- Storage cleanup no "Resetar dados" (fotos de anúncio/comprovantes ficam órfãs, avisado na
  própria tela — não implementado por escopo desta rodada).
- Testar de verdade o job de expiração automática (`funnel-expirations`) — pendência antiga, ainda
  não observada expirando nada de fato.
- Se o usuário mencionar `RESEND_FROM_EMAIL`/domínio de e-mail de novo: hoje todo e-mail do
  sistema sai como `casah.imb.br` independente do tenant dono da ação (nota já registrada acima em
  "Supabase" e detalhada mais abaixo).

---

**Fase 5 fechada de vez (2026-08-26), incluindo o redesign visual dos 4 templates.** Depois do
fechamento inicial (função + 4 gatilhos testados com o envelope simples), o usuário pediu um
visual "moderno e profissional" pros e-mails: cabeçalho com logo em fundo branco + nome do tenant
em destaque (33px, cor primária do tenant), faixa de cor no topo, blocos de destaque pra
valores/datas, botões à prova de bugs em cliente de e-mail, rodapé com o slogan da PlaceHub.
Processo: desenhei o template de boas-vindas primeiro como prévia (Artifact publicado com o HTML
real de produção dentro de um iframe — não uma reinterpretação "bonita" da Artifact, o e-mail de
verdade, pra aprovação ser sobre o que vai ser enviado), o usuário pediu 2 ajustes (tirar emoji do
título, aumentar/recolorir o nome do tenant pra 33px/cor primária), aprovou, e só então repliquei
o padrão pros outros 3 tipos numa página com abas. Código de produção
(`supabase/functions/send-notification-email/index.ts`, funções `emailShell()`/`highlightBox()`/
`ctaButton()`) atualizado, reimplantado pelo usuário no painel, e os 4 tipos retestados ponta a
ponta contra o Resend real — confirmados recebidos com o novo visual. Branch de snapshot
`fase-5-notificacoes` a criar neste commit.

Dois problemas de configuração apareceram no primeiro fechamento e foram corrigidos (não eram
bugs de código):
- `RESEND_API_KEY` inicial era inválida (401 do Resend) — usuário gerou uma key nova.
- `RESEND_FROM_EMAIL` estava `naoresponda@placehub.app`, mas o domínio verificado no Resend é
  **`casah.imb.br`** (do tenant de teste), não `placehub.app` — corrigido pra
  `naoresponda@casah.imb.br`. **Implicação pra quando houver mais de um tenant**: hoje só existe
  um sender verificado no Resend, então todo e-mail do sistema (de qualquer tenant) sai como
  `casah.imb.br`, não do domínio do tenant dono da ação — aceitável agora (single-tenant de
  fato), mas vira backlog real assim que houver um segundo tenant em produção precisando de
  identidade própria no remetente (exigiria verificar o domínio de cada tenant no Resend e
  escolher o `from` dinamicamente por `tenant_id` dentro da function, em vez do secret fixo
  atual).

Resíduo de dados de teste no Supabase desta sessão (mesmo padrão de "não urgente, nada
destrutivo" já usado nas fases anteriores — ver "Notas técnicas" abaixo):
- Broker "Corretor Qa Comissao" ganhou e-mail `adenauerteixeira@gmail.com` (estava vazio) pra
  testar "comissão liberada".
- Lead "Cliente Qa Comissao 2" ganhou e-mail `adenauerteixeira@gmail.com` (estava vazio) pra
  testar "recibo de pagamento".
- Dois usuários novos criados no tenant Casah pra testar "boas-vindas" (papel Corretor, sem
  permissões, senha `TesteQa#2026`, login de verdade): "Qa Teste Boas Vindas" /
  `adenauerteixeira+welcome@gmail.com` e "Qa Teste Boas Vindas 2" /
  `adenauerteixeira+welcome2@gmail.com`. Considerar desativar/excluir quando fizer a limpeza
  geral.
- Reserva "QA Teste Notificacao 2" (cancelada, criada 2x) no anúncio "Casa QA Teste 3 quartos".

**Fase 6 em andamento (2026-08-27).** Vitest, Playwright e Changelog no sistema prontos. Ver bloco
"Fase 6" logo acima e em ROADMAP.md/CHANGELOG.md pros detalhes completos (arquitetura de testes,
bug real achado e corrigido, decisão de não limpar dados de teste, página `/changelog`).
**Monitoramento de erros (GlitchTip) foi proposto e adiado a pedido do usuário** (2026-08-27) —
não é bloqueante, precisa de conta externa nova; retomar só se o usuário pedir de novo, sem
perguntar de novo qual serviço (já decidido: GlitchTip, compatível com `@sentry/react`). Itens
restantes sem código ainda: revisão de acessibilidade, domínio próprio por tenant, testar de
verdade o job de expiração automática (pendência real desde a Fase 3).

**Rodada de Identidade Visual fechada (2026-08-27)** — ver bloco próprio acima ("Rodada de
melhorias em Identidade Visual") pros detalhes: fix do logo do e-mail no Gmail Android (aba
E-mails, upload dedicado com fundo embutido), "Enviar e-mail de teste", toggle do banner de
destaque da home pública, e a tela reorganizada em 4 abas. **Redesenho animado da home pública:
feito e fechado** (mesma sessão) — hero com scroll + partículas configuráveis (bloco "Hero da home
animada ganhou opções..." acima) e depois a experiência completa por scroll com GSAP
(bloco "Property Story..." acima). Página **alternativa** nova, com switch em Identidade Visual
pra escolher qual exibir. **Pendência real, ainda não resolvida**: o usuário reportou que o logo
do e-mail continua sendo invertido pelo Gmail Android mesmo como pixel de imagem (não só CSS) —
ele decidiu adiar esse tópico explicitamente ("isso revemos depois") pra focar na home animada;
retomar se ele voltar a mencionar. Também ficou pendente: o que exatamente chamou atenção dele na
3ª referência do YouTube que ele mandou como inspiração (chamou de "muito top", mas não chegou a
descrever o que especificamente); não foi crítico pro resultado final, mas vale perguntar se for
relevante numa próxima rodada de ajuste fino da coreografia.

**Melhorias na calculadora de ágio implementadas (2026-08-26)**
(`src/features/announcements/agio-calculator-dialog.tsx`), os dois pontos pendentes da sessão
anterior:
1. **Taxa de transferência em %.** Campo "Taxa de transferência" (0,00%) dividindo a mesma célula
   do grid com "Custos de transferência" — calcula em cima de "Valor de mercado atual" e preenche
   o custo automaticamente (`useEffect` reagindo a `taxaTransferencia`/`valorMercado`); se o valor
   de mercado ainda não foi informado, o efeito simplesmente não roda (sem NaN). Editar o custo
   manualmente depois funciona normalmente — só é recalculado de novo se taxa ou valor de mercado
   mudarem.
2. **Prestação + vencimento com recálculo automático.** Campos "Valor da prestação" e "Dia de
   vencimento", mais um campo interno `dataReferencia` (ISO, não editável na UI) que marca até
   quando "já pago"/"saldo devedor" estão em dia. Ao abrir a calculadora, `countElapsedInstallments`
   conta quantos vencimentos caíram entre `dataReferencia` (exclusive) e hoje (inclusive, mês a
   mês — cobre qualquer intervalo, não só o mesmo ano) e soma/subtrai a prestação de "já pago"/
   "saldo devedor" antes de exibir, mostrando um aviso âmbar com quantas parcelas venceram e desde
   quando. `dataReferencia` avança pro último vencimento processado só quando o usuário clica
   "Aplicar" (Cancelar não persiste o recálculo) — é setada automaticamente pra hoje na primeira
   vez que ambos valor da prestação e dia de vencimento são preenchidos. Tudo dentro do
   `agio_calculation` jsonb existente, sem migration nova.

Sem QA manual no navegador ainda (só `tsc --noEmit` limpo) — vale abrir um anúncio de Cessão com
dados de teste e conferir: (a) taxa preenchendo o custo em tempo real; (b) o aviso de parcelas
vencidas aparecendo ao reabrir a calculadora com uma `dataReferencia` antiga simulada no banco.

---

**Fase 4 está fechada** (branch de snapshot `fase-4-comissoes-dashboard` já criada) **e a 6ª
rodada de melhorias pós-Fase 4 (menu aninhado, ver/ocultar senha, regras de senha) também.**
Antes de avançar pra Fase 5 (E-mail e notificações — ver ROADMAP.md), vale considerar os itens em
aberto abaixo, nenhum bloqueante:
- Testar de verdade o job de expiração automática (`funnel-expirations`, Fase 3) — ainda nunca foi
  observado expirando algo de fato, só revisado no código.
- Testar o dashboard/relatórios logado como `broker` de verdade (só foi testado como
  `tenant_admin` nesta sessão) — os ramos condicionais por papel são simples e já passam no
  typecheck, então o risco é baixo, mas vale confirmar visualmente numa próxima sessão.

Aguardando o usuário confirmar início da Fase 5.

Sem pendência bloqueante. Limpeza de dados de teste no Supabase fica pra quando for conveniente
(ver "Notas técnicas" abaixo — não é urgente, nenhum é destrutivo deixar; inclui agora também os
registros "QA Comissao" criados testando comissões na Fase 4).

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
- **O skill `browser-automation` (patchright) pode ficar sem o Chromium baixado nesta máquina**
  se algum outro processo rodar `npx playwright install` (o `@playwright/test` deste projeto, por
  exemplo — instalado na Fase 6 pros testes e2e) — ele remove versões de Chromium "não usadas" do
  cache compartilhado em `%LOCALAPPDATA%\ms-playwright`, incluindo a que o patchright da extensão
  do VS Code espera. Sintoma: `browserType.launch: Executable doesn't exist at
  ...\chromium-<versão>\chrome-win64\chrome.exe`. Correção: achar a versão do patchright em uso
  (`Get-ChildItem -Recurse -Filter patchright -Directory` em
  `C:\Users\<usuário>\.vscode\extensions\`, pegar a mais recente) e rodar
  `node <caminho>\node_modules\patchright\cli.js install chromium`. Alternativa mais rápida quando
  isso acontecer no meio de uma sessão: pular o skill e usar `@playwright/test` diretamente (já
  instalado no projeto) num script Node ad-hoc — foi o que resolveu o QA da página `/changelog`
  nesta sessão sem esperar o download de novo.
- Ao rodar QA com o skill `browser-automation` neste projeto: sempre reiniciar o dev server
  (matar processo na porta, subir de novo, esperar "assentar" uns 3s) antes de testar depois de
  editar arquivos — testar durante uma janela de HMR ativo produz `ERR_ABORTED` em cascata que
  não tem nada a ver com bugs reais do app.
- **`lsof -ti:5173 | xargs kill` NÃO mata o servidor de dev neste ambiente** (Windows/Git Bash,
  listener em `[::1]`) — falha silenciosamente, sem erro. Use `netstat -ano | grep LISTENING |
  grep :5173` pra achar o PID real e `taskkill //F //PID <pid>`. Já causou uma sessão inteira de
  debug perseguindo um "bug" que na verdade era um processo zumbi servindo a versão antiga do
  código.
- **Uma página React em branco (0 elementos em `#root`, 0 erros no console do navegador
  capturados pelo `browser-automation`) pode ser um crash real de render** — o overlay de erro do
  Vite roda dentro de shadow DOM (`document.body.innerText` não alcança) e o console-listener do
  Playwright às vezes não captura o "Unhandled error" que o Vite reporta via WebSocket pro
  próprio terminal. **Quando a página some sem pista nenhuma no navegador, olhe o log do processo
  do `npm run dev`** (rode-o redirecionando pra um arquivo, ex. `npm run dev >
  /tmp/vite-dev.log 2>&1 &`, e dê `tail` nesse arquivo) — foi assim que se achou o bug real desta
  sessão (`PhoneInput` recebendo `value=undefined` porque um `useForm` esqueceu `defaultValues`).
- **`page.evaluate()`/`console.log` no `browser-automation` deste ambiente rodam num isolated
  world separado do `window` real da página** (típico de automação via extensão de navegador) —
  escrever `window.__DEBUG__ = x` de dentro do código React e depois ler
  `page.evaluate(() => window.__DEBUG__)` no script de teste **sempre retorna `undefined`**,
  mesmo quando o código React roda perfeitamente e a variável É definida (só que no `window` do
  outro world). Já custou uma sessão inteira "provando" que um `console.log` no topo de um
  componente não executava, quando na verdade executava. Pra depurar estado do React nesse
  ambiente, **renderize o valor num elemento DOM visível e leia via `page.locator(...).
  innerText()`** — DOM e requisições de rede são compartilhados entre os worlds, `window` não é.
- **Radix Select (`src/components/ui/select.tsx`) perdia o valor silenciosamente em qualquer
  edição** (bug de plataforma achado e corrigido em 2026-08-25/26, ver CHANGELOG) — qualquer
  `<Select>` aninhado num `<form>` mantém um `<select>` nativo oculto pra bubbling; ao mudar o
  value controlado pra algo cujo `SelectItem` nunca foi renderizado com o dropdown aberto (comum
  em `reset()` carregando um registro existente), esse nativo não acha a `<option>`, o navegador
  reseta pra `""` e o Radix repassa como `onValueChange("")`. Corrigido globalmente no wrapper
  `Select`, ignorando esse evento fantasma — nenhuma tela do app usa string vazia como valor
  legítimo. **Ao adicionar qualquer Select novo, não é preciso reaplicar nada — a correção já
  protege todo mundo.**
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
  ilike '%qa%' or title ilike '%qa%'` cobre a maioria). Da Fase 3/4: leads "João Qa da Silva" e
  "Cliente Qa Comissao"/"Cliente Qa Comissao 2", corretor "Corretor Qa Comissao" (vinculado ao
  login `creci.qa.isolate@example.com`, usado pra testar a confirmação de recebimento do
  corretor) e as vendas/comissões geradas a partir deles (cascade ao apagar os leads via
  negociação → venda → comissão). Da calculadora de ágio/cadastro rápido: vários anúncios "Casa QA
  Diag*"/"Casa QA Sanity*"/"Casa QA Final Combo" e os registros "Empreendimento/Parceiro/
  Proprietario/Corretor Qa Final" criados testando o cadastro rápido — o mesmo `ilike '%qa%'`
  acima cobre a maioria. Nada disso é destrutivo deixar.

## Decisões em aberto / para revisitar

- Nenhuma pendente no momento. Se surgir uma dúvida de arquitetura, registrar aqui antes de
  decidir sozinho.

## Notas úteis

- O clone de inspeção do sistema Laravel antigo está em
  `c:\Desenv\VSCode\ProjetosLaravel\placehub` (fora do repo novo, só para consulta pontual ao
  domínio de negócio original — controllers relevantes já lidos: `CommissionController`,
  `SaleController`, `DashboardController`, `ReportController`).
