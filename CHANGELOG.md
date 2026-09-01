# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas no
formato AAAA-MM-DD.

## [Não lançado]

### Corrigido (Property Story — foto de capa clicável e navegação de volta, 2026-08-28)

- **Foto de capa da home animada agora é um link** pro anúncio (mesmo destino do botão "Ver
  imóvel"), com `cursor-pointer` e `hover:scale-1.2` — escala aplicada no wrapper `<Link>`, não na
  `<img>`, pra não conflitar com o `transform` que o GSAP já anima nela via ref.
- **Link "← Voltar aos anúncios" (detalhe do anúncio) agora usa `navigate(-1)`** em vez de sempre
  voltar pra home no topo — preserva a posição de rolagem/animação de onde o usuário veio (mesmo
  mecanismo do botão voltar do navegador, `history.go(-1)`), com fallback pra `/` quando não há
  histórico do app (acesso direto por URL).

### Adicionado (Primeiro deploy em produção — Vercel + domínio próprio, 2026-08-28/29)

- **App no ar pela primeira vez.** Projeto Vercel (`place-hub1/placehub`) conectado ao GitHub
  (`adenauerteixeira/placehub-react-viti`, branch `trunk`) — deploy automático a cada push.
  `vercel.json` com rewrite de SPA (`/* → /index.html`), essencial pro React Router funcionar em
  rotas diretas (sem isso, `/dashboard` direto na URL dava 404 da Vercel).
- **Domínio raiz da plataforma:** `placehub.app` já estava registrado por terceiros — o usuário
  registrou **`placehubapp.com.br`** no lugar. Apex + wildcard (`*.placehubapp.com.br`) apontados
  pra Vercel; certificado HTTPS emitido automaticamente depois do DNS propagar.
- **Domínio próprio do tenant Casah:** `casah.imb.br` (já usado pra e-mail via Resend) também
  atrelado ao mesmo projeto Vercel e resolvendo pro tenant `casah` — funciona porque a resolução
  de subdomínio (`src/lib/hostname.ts`) é agnóstica de domínio, não hardcoded pra
  `placehubapp.com.br`.
- **Bug real achado e corrigido: domínios `.com.br` de 3 labels quebravam a resolução de
  tenant/plataforma.** `rootDomain()` assumia "sempre os últimos 2 labels" do hostname — funciona
  pra domínios de 2 labels (`placehub.app`, `imb.br`), mas pra `placehubapp.com.br` calculava a
  raiz como `com.br` e tratava `placehubapp` como se fosse label de tenant, causando "Imobiliária
  não encontrada" na home da própria plataforma. Uma Public Suffix List também não resolveria (
  testado com a lib `tldts`, depois removida): o `*.br` genérico da PSL trataria `imb.br` como
  categoria tipo `com.br`, quebrando o caso do domínio de tenant pro lado oposto. Fix: lista
  explícita (`KNOWN_ROOT_DOMAINS`) dos domínios raiz que a aplicação de fato serve, com fallback
  pro heurístico genérico nos demais casos (dev, preview da Vercel).
- Formulário de criar/editar imobiliária (console da plataforma) trocou o sufixo de subdomínio
  fixo `.placehub.app` por `rootDomain()` — mostra o domínio raiz de verdade, dinamicamente.

### Corrigido (Login quebrado em domínio próprio de tenant, 2026-09-01)

- **`casah.imb.br` travava em "Não foi possível carregar seu perfil" pra qualquer usuário logado**
  (reportado pelo usuário, mesma sintomatologia visual do bug de resolução de domínio acima, mas
  causa raiz diferente). O navegador rejeitava silenciosamente o cookie de sessão com
  `Domain=.imb.br` — mesma proteção "public suffix" já documentada pro `.localhost` em dev,
  só que o Chrome aplica a alguns domínios `.br` de 2 labels mesmo depois do registro.br permitir
  registro direto (confirmado com um teste manual de `document.cookie =` simples, sem nada do
  Supabase envolvido). Sem o cookie salvo, toda requisição seguinte ia só com a anon key (sem
  usuário autenticado de verdade) — RLS de `profiles` retornava 0 linhas, e a busca do perfil
  falhava com 406. `writeCookie()` agora confirma se a escrita com `Domain=` realmente colou (lê
  de volta) e cai pra cookie host-only se não colou; `removeCookie()` limpa as duas variantes
  possíveis, já que não dá pra saber de antemão qual delas ficou de pé.

### Adicionado (Identidade Visual da Plataforma, 2026-08-31)

- **Novo menu "Identidade Visual" pro super_admin** (console da plataforma), espelhando o que já
  existe pro tenant: favicon, logo (tema claro/escuro) e imagem de fundo (tema claro/escuro),
  configuração única pra aplicação inteira (`platform_settings`, singleton via
  `id boolean primary key check (id)`, bucket `platform-branding`).
- **Tela de login da plataforma redesenhada** com a identidade configurada: painel de fundo do
  tamanho do conteúdo (mesma largura da tabela de imobiliárias, não full-bleed na viewport),
  imagem sem filtro/overlay (cores originais, `object-contain` pra não cortar as laterais — trocado
  depois de `object-cover` cortar a arte), card de login em **glassmorfismo** de verdade (fundo
  translúcido + blur, tint mais forte pra contraste — sem forçar texto branco, o próprio
  `--card-foreground` do tema já resolve o contraste certo). Logo e slogan (**"Conecta pessoas à
  lugares. Realiza sonhos!"**) saíram de dentro do hero (a imagem já carrega isso) e viraram parte
  do cabeçalho da página.
- **Console da plataforma:** logo (conforme o tema) antes do texto "PlaceHub" no cabeçalho de
  todas as páginas; "Identidade Visual" e "Changelog" agrupados num menu "Administração" (mesmo
  padrão já usado no tenant); rótulo `| Plataforma – <página> |` perto do `ThemeToggle`.
- **Lista de imobiliárias:** banner com a imagem de fundo da plataforma (conforme o tema), ~1/3 da
  largura da tabela, fora e acima do card da lista — altura da moldura acompanha a altura real da
  imagem (sem aspect-ratio fixo cortando/sobrando espaço).
- Nova opção **"Mostrar borda ao redor da imagem"**, uma por tema, controlando a borda tanto do
  banner da lista de imobiliárias quanto do hero do login (mesma imagem usada nos dois lugares).
- Nova coluna **"Administrador"** na lista de imobiliárias — e-mail de cada `tenant_admin`
  vinculado ao tenant (via `profiles`, RLS já deixa super_admin ver perfis de qualquer tenant).
- Componentes compartilhados novos: `NavGroup` (extraído de `tenant-layout.tsx`, que já usava esse
  padrão de dropdown pra "Comercial"/"Administração") e `PlatformPageLabel`.

### Adicionado (Manual do Corretor — PDF + página de treinamento web, 2026-09-01)

- **PDF de treinamento** (34 páginas): capa, sumário, 13 capítulos cobrindo a jornada completa do
  corretor (Painel, Leads, Negociações, Reservas, Propostas, Vendas, Comissões, Anúncios, perfil
  público, boas práticas, referência de status) com capturas de tela reais — testado ao vivo no
  tenant Casah criando um lead de exemplo ("Mariana Ferreira Souza") e levando ele até a venda
  fechada e a comissão, pra garantir que cada tela documentada bate com o sistema de verdade.
  Gerado via HTML + CSS de impressão renderizado a PDF pelo Chromium (Playwright `page.pdf()`),
  sem serviço externo.
- **Página de treinamento dentro do app** (`/treinamento`), mesmo conteúdo do PDF reaproveitado
  como página web navegável por capítulo (nav lateral com âncoras), com o tema do tenant aplicado
  automaticamente. Habilitável por tenant — toggle **"Habilitar página de treinamento pra equipe"**
  em Identidade Visual → Página pública (`tenants.training_enabled`). Item "Treinamento" no menu
  só aparece quando habilitado; acesso direto pela URL sem habilitar mostra uma mensagem amigável
  em vez de 404. Sem exigir permissão de módulo específica — qualquer usuário logado do tenant vê,
  uma vez habilitado pelo admin. Capturas de tela vivem em `public/training/` (assets estáticos,
  reaproveitados do mesmo material do PDF).

### Adicionado ("Resetar dados" — limpeza pós-treinamento, 2026-09-01)

- **Novo item "Resetar dados" no menu Administração** (`/resetar-dados`, só `tenant_admin`), pra
  limpar o que os corretores geram praticando o manual sem mexer em cadastro. Duas opções de
  escopo, cada uma com o risco explicado na própria tela: **Funil comercial** (Leads, Negociações,
  Propostas, Reservas, Vendas e Comissões — Anúncios ficam intactos) ou **Funil comercial +
  Anúncios** (também apaga os imóveis cadastrados, fotos e amenidades inclusas).
- **Senha reconferida no servidor** antes de apagar qualquer coisa (Edge Function
  `reset-tenant-data` reautentica com `signInWithPassword` descartável — não dá pra pular a
  confirmação chamando a API direto) + `window.confirm()` final na tela, mesmo padrão já usado em
  outras ações destrutivas do app.
- Função de banco `reset_tenant_commercial_data` (`SECURITY DEFINER`, `EXECUTE` revogado de
  `authenticated`/`anon` — só a Edge Function chama, via `service_role`) desliga temporariamente
  dois triggers de validação de negócio que bloqueariam o apagamento em massa
  (`proposals_guard_delete`, que impede excluir proposta aceita, e
  `announcements_validate_publish`, que exige descrição/cidade/UF/preço pra publicar) e deleta na
  ordem certa pra respeitar as FKs. `tenant_id` nunca vem do client — é sempre o do perfil de quem
  chamou, então um `tenant_admin` só consegue resetar o próprio tenant.
- **Dois bugs reais achados testando ao vivo em produção antes de dar por pronto:** (1) anúncio
  marcado "Vendido"/"Reservado" ficava travado nesse status mesmo depois da venda/reserva que
  justificava isso ser apagada — corrigido revertendo pra "Publicado" quando o reset não inclui
  Anúncios; (2) esse revert de status esbarrava na validação de publicação (dados incompletos em
  fixtures de QA antigas), derrubando a transação inteira — corrigido desligando o mesmo tipo de
  trigger-guard durante o reset.
- **Limitação conhecida, avisada na própria tela:** fotos de anúncio e comprovantes já enviados não
  são removidos do Storage — só as referências no banco somem.

### Alterado (Property Story — "deck panorâmico" virou colagem, 2026-08-28)

- **Coreografia de entrada dos imóveis redesenhada do zero**, a pedido do usuário com imagem de
  referência (colagem estilo Polaroid): as fotos secundárias de cada imóvel agora sobem de baixo
  da tela juntas (leve stagger entre elas, ease `back.out` com efeito de "pouso") e se espalham em
  5 posições fixas ao redor do centro (`collageSlotFor`, `property-story-variants.ts`) — não é
  mais um baralho sequencial foto-a-foto com fan-out lateral. A foto de capa sobe por cima logo
  em seguida (mesmo evento, sobrepõe a cauda da montagem da colagem), sempre centralizada e com
  z-index maior, com o cartão de vidro entrando colado nela. As 5 variantes de coreografia por
  tipo de imóvel (right/alternate/depth/scale-parallax/horizontal) foram removidas — a colagem usa
  o mesmo layout pra todos os tipos.
- Fotos da capa e da colagem ganharam borda branca contrastante (efeito Polaroid, delimita uma
  foto da outra quando se sobrepõem) — mesma espessura nas duas (`border-[6px]`), a pedido do
  usuário.
- Capa dimensionada em ~2x o tamanho de uma foto da colagem (`top-[10%] left-[10%] size-[80%]` do
  palco), fixo pra qualquer largura de tela — decisão explícita do usuário depois de descartar uma
  tentativa anterior de encolher por breakpoint (parecia "grande" demais em telas médias mesmo
  reduzida).
- Contador "01/26" novo no canto superior direito de cada categoria (só quando há 2+ imóveis).
- **Partículas conectadas desacopladas da imagem de fundo do hero** (antes eram mutuamente
  exclusivas) e viraram um fundo fixo de página inteira, visível durante toda a rolagem dos
  anúncios — não só na tela inicial.
- Gap de ~20px entre a barra sticky de categorias e o título de cada seção.

### Corrigido (dois bugs reais achados durante o redesign da colagem, 2026-08-28)

- **Duração do pin de scroll zerando silenciosamente**: virou uma função (`end: () =>
  tl.duration()`) que referenciava a variável `tl` antes dela ser atribuída (ainda avaliando o
  lado direito de `tl = gsap.timeline(...)`) — o pin nascia com comprimento ~0 e nunca corrigia.
  Revertido pra um total pré-calculado em números puros (`totalScrollUnits()`), espelhando a
  mesma matemática de posições relativas da timeline.
- **Foto de capa colapsando pra ~12×12px independente do valor de tamanho no código**: `<img>` é
  um elemento *replaced* no CSS — `inset-X%` sozinho, sem `width`/`height` explícitos, não estica
  ele como estica uma `<div>` comum (o navegador usa o algoritmo de tamanho intrínseco do
  elemento substituído, resultado ~0). Substituído por `top`/`left` (posição) + `size-[X%]`
  (tamanho explícito). Confirmado por medição direta no DOM antes/depois da correção, não só
  inspeção visual.

### Adicionado (Título dinâmico da aba do navegador, 2026-08-28)

- Título vira **"{nome do tenant} | Place Hub"** em toda página com escopo de tenant (painel
  autenticado + as 5 páginas públicas) — antes era sempre o `<title>` estático do `index.html`
  ("PlaceHub"), igual pra qualquer tenant. Hook novo `useTenantTitle`
  (`src/features/tenant-branding/use-tenant-title.ts`), mesmo padrão de restaurar o valor anterior
  no cleanup que o `useTenantFavicon` já usava.

### Adicionado (Property Story — apresentação dos anúncios por scroll na home animada, 2026-08-27)

- **Nova experiência de scroll na home animada** (`src/features/tenant/animated-home/property-story/`):
  cada categoria de imóvel vira uma seção pinada em tela cheia (GSAP `ScrollTrigger`) — o título da
  categoria encolhe e fixa no canto superior esquerdo enquanto, por imóvel, as fotos entram uma a
  uma formando um "deck panorâmico" sobreposto (offset horizontal, leve translação/escala/rotação),
  seguido de um cartão glassmórfico com título/specs/localização/descrição/preço/"Ver imóvel" subindo
  por baixo; ao continuar a rolagem, a composição sai e o próximo imóvel entra. Reversível em
  qualquer direção, sem JS específico por anúncio — se adapta à quantidade de fotos de cada imóvel.
- **Coreografia varia por tipo de imóvel** (Casas: deck da direita; Apartamentos: alternado
  esquerda/direita; Lotes: profundidade; Chácaras/Fazendas: escala+parallax; Comerciais:
  horizontal/geométrico) — um único sistema parametrizado (`property-story-variants.ts`), não 5
  implementações separadas.
- Desktop mostra o deck completo com fan-out horizontal; mobile simplifica pra cross-fade sequencial
  (sem sobreposição horizontal). `prefers-reduced-motion` cai numa lista estática (sem nenhum
  `ScrollTrigger` criado), reaproveitando o card já existente.
- Novo hook `usePublicAnnouncementGalleries` (`src/features/announcements/api.ts`) busca a galeria
  completa de várias fotos por anúncio, em lote, pra alimentar o deck.
- Dependências novas: `gsap` + `@gsap/react` (100% grátis, uso comercial incluso), carregadas via
  `React.lazy()` num chunk separado — não pesam no LCP do hero, que continua em Framer Motion.
- **Correção de layout**: a seção pinada usava `h-dvh` (altura cheia da tela) mas era fixada 64px
  abaixo do topo (pra não ficar sob o cabeçalho compacto) — sobrava exatamente 64px de conteúdo
  empurrado pra fora da janela visível, cortando o preço e o botão "Ver imóvel" do cartão. Corrigido
  para `h-[calc(100dvh-4rem)]`.
- **Correção de navegação**: `CategoryNav` usava o `ScrollToPlugin` do GSAP num tween de scroll pra
  pular entre categorias. Ao atravessar 2+ seções pinadas numa única rolagem, a atribuição de
  scrollTop quadro-a-quadro do tween conflitava com a compensação de pin de cada `ScrollTrigger`
  intermediário, e o clique aterrissava a dezenas de milhares de pixels do alvo. Trocado por
  `window.scrollTo({ behavior: 'smooth' })` nativo com o alvo calculado manualmente — o scroll
  nativo do browser não sofre esse conflito, confirmado por teste automatizado mesmo pulando por 3+
  seções pinadas de uma vez.

### Adicionado (Hero da home animada configurável, 2026-08-27)

- **Fundo do hero da home animada agora configurável** (Identidade Visual → Página pública → "Hero
  da home animada", só aparece quando o estilo "Animada" está selecionado): checkbox "Mostrar uma
  imagem de fundo" com upload dedicado (`animated_hero_image_path`, independente do "Plano de
  fundo" da home Clássica) — desmarcado, libera um segundo checkbox "Mostrar efeito de partículas
  conectadas" (`animated_hero_show_particles`). Sem imagem e sem partículas, cai no gradiente das
  cores do tenant que já existia — o hero nunca fica em branco.
- **Efeito de partículas conectadas** (`src/features/tenant/animated-home/particles-background.tsx`)
  — canvas 2D com pontos animados se conectando por linhas quando próximos, repelidos pelo mouse,
  fundo escuro com gradiente radial. Fielmente reproduzido a partir de uma referência que o usuário
  já tinha implementado no sistema Laravel anterior (tela de login). Com `prefers-reduced-motion`,
  desenha só um quadro estático (a rede parada), em vez de animar.
- Migration: `20260827130000_animated_hero_background_options.sql`.

### Corrigido (Permissão "Proprietários" impossível de conceder, 2026-08-27)

- **Bug real reportado pelo usuário**: um corretor tentando cadastrar um proprietário pelo botão
  "+" na tela de anúncio (pra anunciar um imóvel próprio) recebia "new row violates row level
  security policy for table owners". Causa raiz: a permissão `owners` foi adicionada ao catálogo
  do banco na Fase 2 (`20260823090000_catalog_foundation.sql`, com nota reconhecendo que tinha
  ficado de fora do catálogo original da Fase 1), mas a lista espelhada no frontend
  (`PERMISSION_MODULES`, `src/features/tenant-users/permissions.ts`) nunca foi atualizada — sem
  essa entrada, a checkbox "Proprietários" simplesmente não existia na tela de permissões, então
  nenhum tenant_admin conseguia conceder esse acesso a um corretor, por mais que tentasse. A
  policy de RLS em si sempre esteve correta (idêntica ao padrão de `partners`/`developments`).
  Corrigido adicionando a entrada faltante.
- Também: os 4 botões "+" de cadastro rápido na tela de anúncio (Empreendimento/Parceiro/
  Proprietário/Corretor) agora só aparecem quando o usuário tem a permissão do módulo
  correspondente — antes apareciam sempre, e um usuário sem permissão só descobria ao tentar
  salvar e receber o erro cru de RLS. Mesma classe de bug evitada pros outros 3 módulos também.

### Adicionado (Home pública animada — segunda variante opt-in, 2026-08-27)

- **Nova variante "Animada" da home pública** (`src/features/tenant/animated-home/`), alternativa
  opt-in à home clássica de sempre — um switch em Identidade Visual → "Página pública" (campo
  `public_home_variant`, `'classic' | 'animated'`, migration
  `20260827120000_add_public_home_variant.sql`) escolhe qual roda em `/`. Decisão do usuário:
  redundância de propósito — se o visual animado tiver algum problema, dá pra voltar pra Clássica
  na hora, sem perder nada; a home clássica (`public-home-page.tsx`) não foi tocada.
- Experiência: hero em tela cheia (nome/logo/indicador de rolar) que recolhe suavemente pro
  cabeçalho conforme a rolagem e fica fixo lá (só reabre se voltar ao topo); cada tipo de imóvel
  cadastrado vira uma seção com uma caixa fixa à esquerda (`position: sticky`, sem JS de
  posição) enquanto os anúncios revelam à direita (foto entra, dados assentam logo depois);
  a passagem pra próxima categoria acontece sozinha, por geometria de CSS (o sticky solta quando a
  seção acaba), sem nenhum listener de scroll calculando "qual categoria está ativa". Descrição de
  cada anúncio (`Announcement.description`, já existente) reaproveitada como texto de apoio na
  revelação — decisão do usuário de não criar um sistema de "destaques configuráveis" à parte.
- **Decisão arquitetural**: essa página não usa `<AppShell>` (que é `h-dvh overflow-hidden` com
  cabeçalho/rodapé `position: fixed` e um `<main>` que rola sozinho) — precisa da rolagem real da
  janela pra `position: sticky` e `useScroll` do Framer Motion funcionarem sem container
  customizado. Página raiz própria, cabeçalho/rodapé reaproveitando `TenantBrand`/`ThemeToggle`.
  Nova dependência: `motion` (Framer Motion) — zero libs de animação existiam antes no projeto.
  `<MotionConfig reducedMotion="user">` desliga as animações de transform/opacidade quando o SO
  pede redução de movimento, mas não desliga `position: sticky` (layout, não animação).
- Helper novo `groupAnnouncementsByType()` (`src/features/announcements/labels.ts`) — extraído da
  lógica que já existia duplicada na home clássica, agora compartilhado pelas duas variantes.
  Nenhuma query nova: reaproveita `usePublicAnnouncements`/`usePublicAnnouncementCovers`/
  `announcementImageUrl` como estão.
- Testado ponta a ponta via automação de navegador contra dados reais do Casah (28 anúncios "QA
  Vitest" tipo Casa): hero → recolhimento do cabeçalho → caixa fixa + revelação → volta ao topo
  reabre o hero, tudo sem erro de console; navegação pro detalhe do anúncio (`/anuncios/:slug`)
  funcionando; modo de movimento reduzido (`prefers-reduced-motion`) mantém a página usável;
  emulação mobile sem travamento de rolagem; voltar pra "Clássica" confirmado revertendo
  exatamente pro comportamento de antes (valida a redundância que motivou o design).

### Adicionado (Identidade Visual — e-mails, página pública e organização em abas, 2026-08-27)

- **Logo do cabeçalho de e-mail quase invisível no modo escuro do Gmail Android** (achado pelo
  usuário testando os templates da Fase 5 no celular): o Gmail app reescreve o e-mail no modo
  escuro do celular ignorando `color-scheme`/`supported-color-schemes` (adicionados mesmo assim,
  ajudam em outros clientes) e cor de fundo via CSS/`bgcolor` — mas nunca altera pixels de imagem.
  Resolvido em duas camadas: (1) nova aba **"E-mails"** em Identidade Visual com cor de fundo do
  logo dedicada (`email_logo_background_color`/`email_logo_background_transparent`, independente
  do fundo usado no app) aplicada ao cabeçalho inteiro do e-mail (não só um pedacinho ao redor do
  logo); (2) upload dedicado **"Logo do e-mail"** (`email_logo_path`) — uma versão do logo com o
  fundo já "assado" nos próprios pixels da imagem, imune a qualquer reescrita de cliente de
  e-mail, com fallback pro `logo_light_path` de sempre quando não enviada. Testado ponta a ponta
  contra o Resend real e confirmado recebido no Gmail Android — a logo em si ficou nítida e
  legível. **Achado adicional, confirmado com dois testes reais**: o Gmail Android inverte
  **qualquer** cor de fundo clara pro seu próprio equivalente escuro (mesmo matiz, luminosidade
  invertida), não só tons quase-brancos — não existe cor clara configurável que escape disso
  especificamente nesse cliente; só pixel de imagem escapa. Decisão registrada com o usuário:
  aceitar a versão escura que o Gmail gera (o resultado ficou esteticamente aceitável — nome do
  tenant continua legível) em vez de perseguir mais tentativas de cor. Corrigido no processo: o
  campo "Fundo do cabeçalho do e-mail" estava incorretamente desabilitado quando havia logo com
  fundo embutido, mesmo esse campo controlando o cabeçalho inteiro (não só a logo) — agora sempre
  editável.
- **"Enviar e-mail de teste"** na aba E-mails — dispara um e-mail de exemplo (mesmo `emailShell()`
  de produção) pra qualquer endereço, usando a identidade visual **já salva** do tenant. Novo tipo
  `test` na Edge Function `send-notification-email`, restrito a `tenant_admin`.
- **Banner de destaque da home pública ("área de publicidade do tenant") agora é opcional** —
  checkbox `public_hero_enabled` (aba "Página pública" de Identidade Visual) esconde/mostra a
  seção com nome da imobiliária, frase de efeito e botão "Ver corretores" no topo de `/` sem mexer
  no resto da página pública.
- **Identidade Visual reorganizada em abas** (Logos e imagens / Cores / Página pública / E-mails)
  — a tela tinha crescido demais como uma lista vertical de cards; agrupar por assunto facilita
  achar o que se quer ajustar. "Salvar identidade visual" continua fora das abas, salvando tudo de
  uma vez (o estado é um objeto único, independente de qual aba está visível).
- Migrations: `20260827100000_email_branding_and_public_hero_toggle.sql` (as 3 colunas acima) e
  `20260827110000_email_logo_asset.sql` (`email_logo_path`).

### Adicionado (Fase 6 — Changelog dentro do sistema, 2026-08-27)

- **Página `/changelog`** (`src/features/changelog/changelog-page.tsx`), acessível pelo
  super_admin no console da plataforma (`app.placehub.app`) e pelo tenant_admin de cada
  imobiliária (item novo no dropdown "Administração" do header, ao lado de "Identidade visual").
  Renderiza o próprio `CHANGELOG.md` do repositório — importado em build time via `?raw` (suporte
  nativo do Vite) e desenhado com `react-markdown` (headings, listas, negrito e links estilizados
  com os tokens de tema do app, dentro de um `Card` padrão). Decisão do usuário: reaproveitar o
  arquivo técnico existente em vez de manter um changelog separado, curado, em linguagem de
  usuário final — o texto inclui nomes de arquivo/migration/SQL como está.

### Adicionado (Fase 6 — testes Playwright dos fluxos principais, 2026-08-26)

- **Playwright configurado** (`playwright.config.ts`, `npm run test:e2e`), rodando contra o dev
  server local no subdomínio do tenant Casah (`http://casah.localhost:5173` — mesmo padrão do QA
  manual, `webServer` do Playwright sobe/reaproveita o `npm run dev` sozinho). Usa as mesmas
  credenciais de teste do `.env.test.local` da suíte Vitest.
- `tests/e2e/login.spec.ts`: credenciais válidas de tenant_admin redirecionam pra `/dashboard`;
  credenciais inválidas mostram o toast de erro e mantêm o usuário em `/login`.
- `tests/e2e/lead-to-sale.spec.ts`: fluxo completo pela UI real — login → `/leads` criar lead
  (só o nome é obrigatório) → `/negotiations` criar negociação selecionando esse lead → abrir o
  hub da negociação → criar proposta (só o valor) → editar a proposta pra status "Aceita" →
  "Fechar venda" com os valores padrão do formulário (comissão 5%, sem parcelas/bens) → confirma
  que o botão "Fechar venda" some da lista e que a negociação vira "Ganha". Não passa por
  `announcement_id` (campo opcional na negociação) — evita ter que simular o formulário de
  anúncio, que tem bem mais campos obrigatórios (capa, descrição, cidade/UF, preço).
- **Achados durante a implementação** (documentados em comentário no próprio spec): o `SelectTrigger`
  do shadcn/Radix não expõe um nome acessível confiável pro Playwright reconhecer via
  `getByRole('combobox', { name: ... })` — cada `<Select>` também renderiza um `<select>` nativo
  oculto (mesmo mecanismo do bug de perda de valor documentado nas Fases 2/notas técnicas),
  então o teste seleciona pela posição (`.first()`) dentro do diálogo em vez de por nome. O rótulo
  "Senha" também colide com o botão "Mostrar senha" do campo — resolvido com `{ exact: true }`.

### Adicionado (Fase 6 — testes Vitest de integração, 2026-08-26)

- **Vitest configurado** (`vitest.config.ts`, `npm run test`/`test:watch`) com testes de
  **integração** — não unitários — contra o Supabase real, autenticando como um tenant_admin e um
  corretor de teste reais do tenant Casah (`.env.test.local`, gitignored, ver
  `.env.test.local.example`). Decisão: as regras críticas (conversão reserva→venda, trava
  financeira de venda concluída, cálculo de comissão) vivem inteiramente em funções/triggers SQL,
  não em TypeScript — testar via RPC real é a única forma de validar o comportamento de verdade,
  não uma cópia da lógica.
- `tests/integration/reservation-to-sale.test.ts`: `reserve_announcement` marca o anúncio como
  reservado, rejeita reservar um anúncio já reservado, e `create_sale_from_proposal` com
  `p_reservation_id` converte a reserva (`status='converted'`, `sale_id`, `converted_at`) e marca o
  anúncio como vendido.
- `tests/integration/sale-financial-lock.test.ts`: `cancel_sale` funciona uma vez numa venda
  `completed`, rejeita cancelar de novo, e cancela a comissão junto. (A trava em si —
  `guard_sale_financial_lock`, bloqueia UPDATE em coluna financeira — não tem como ser exercitada
  pelo client anônimo: `sales` não tem policy de UPDATE pra ninguém, só as funções security definer
  escrevem nela; testar a checagem de status do `cancel_sale`, que é a porta real de mutação
  pós-venda, é a cobertura possível sem a service_role key.)
- `tests/integration/commission-calculation.test.ts`: corte do corretor = `min(commission_percentage
  do corretor, percentual total da venda)` nos dois ramos (clampado e não-clampado), venda sem
  corretor joga 100% pra imobiliária, e a distribuição pro-rata nas parcelas de entrada soma
  exatamente de volta ao total (a última parcela absorve o resto do arredondamento).
- **Bug real encontrado e corrigido durante a implementação**: `create_sale_from_proposal` tinha
  **duas versões sobrecarregadas** coexistindo no banco — a migration da Fase 4
  (`20260827090000_commissions_and_audit.sql`) usou `create or replace function` pra acrescentar
  `p_commission_percentage`, mas como a lista de parâmetros mudou (9 → 10), o Postgres criou uma
  função nova em vez de substituir a da Fase 3; a antiga nunca foi removida. Qualquer chamada RPC
  que omitisse `p_commission_percentage` (contando com o default = 5) ficava ambígua pro PostgREST
  (`PGRST203`). O client sempre manda o parâmetro explicitamente (não quebrou em produção), mas os
  próprios testes esbarraram nisso na primeira rodada. Corrigido com
  `20260826200000_drop_stale_create_sale_from_proposal_overload.sql` (`drop function` da versão
  antiga), aplicada pelo usuário via SQL Editor.

### Alterado (Redesign profissional dos 4 templates de e-mail, 2026-08-26)

- **Envelope visual novo** em `emailShell()` (`supabase/functions/send-notification-email/index.ts`),
  reaproveitado pelos 4 tipos (boas-vindas, nova reserva, comissão liberada, recibo de
  pagamento): cartão branco com cantos arredondados sobre fundo cinza-claro, faixa de destaque de
  4px no topo na cor primária do tenant, cabeçalho com fundo branco trazendo a logo (tema claro)
  ao lado do nome da imobiliária em destaque (33px, na cor primária do tenant), preheader oculto
  pra melhorar a prévia na caixa de entrada, blocos de destaque cinza-claro pra valores/datos
  chave (`highlightBox()`), botões de ação à prova de bugs em cliente de e-mail — cor de fundo no
  `<td>`, não no `<a>` (`ctaButton()`) — e rodapé com aviso de "não responda" do tenant seguido do
  slogan da PlaceHub ("Conectando imóveis, corretores e oportunidades"), reaproveitando o mesmo
  texto do rodapé do próprio app. Desenhado e aprovado iterativamente com o usuário via prévia
  publicada como Artifact (HTML real dentro de um iframe, com abas pra alternar entre os 4 tipos),
  não só descrito — cada ajuste pedido (remover emoji do título, aumentar/recolorir o nome do
  tenant) foi aplicado no artifact antes de ir pro código. Reimplantado e testado ponta a ponta de
  novo contra o Resend real depois da mudança — os 4 e-mails confirmados recebidos com o novo
  visual.

### Adicionado (Fase 5 — e-mails transacionais via Resend, 2026-08-26, testado ponta a ponta)

- **Edge Function `send-notification-email`** (`supabase/functions/send-notification-email/`):
  4 tipos de e-mail — boas-vindas (conta criada), nova reserva confirmada (cliente), comissão
  liberada (corretor confirmar recebimento) e recibo de pagamento (parcela de venda recebida).
  Envelope HTML único (`emailShell()`) com a cor primária e o logo do tenant, chamando a API do
  Resend (`RESEND_API_KEY`/`RESEND_FROM_EMAIL` como secrets da function, nunca no repo). Envio
  sempre best-effort — nenhum dos 4 gatilhos pode falhar a ação principal (criar conta, reservar,
  registrar repasse, receber parcela) por causa de erro no e-mail.
- **Autorização por tipo**: "boas-vindas" só é aceito quando o chamador é o próprio projeto
  (Authorization = service role key, comparado por string) — é disparado de dentro de
  `create-tenant-admin`/`invite-tenant-user` antes de existir sessão do novo usuário. Os outros 3
  tipos exigem sessão de usuário comum cujo `tenant_id` bate com o tenant dono do registro
  referenciado (reserva/parcela de comissão/parcela de venda), pra um usuário de um tenant não
  conseguir ler dados ou disparar e-mail usando o id de um registro de outro tenant.
- **Gatilhos**: `useReserveAnnouncement` (nova reserva), `useRegisterBrokerPayment` (comissão
  liberada) e `useReceiveInstallment` (recibo de pagamento) chamam
  `supabase.functions.invoke('send-notification-email', ...)` no `onSuccess`, sem bloquear nem
  travar a UI se o envio falhar (`.catch(() => {})`).
- **Testado ponta a ponta contra o Resend real**, dirigindo o navegador com um login de
  `tenant_admin` de teste: reservar um anúncio com e-mail de cliente preenchido (nova reserva),
  registrar/reenviar aviso de uma parcela de comissão de um corretor com e-mail cadastrado
  (comissão liberada), receber uma parcela de venda cujo lead tinha e-mail (recibo de pagamento),
  e criar um usuário novo (boas-vindas, disparada server-to-server de dentro de
  `invite-tenant-user` — não aparece na network do browser, só validada pelo e-mail recebido). Os
  4 e-mails confirmados recebidos pelo usuário. No caminho, dois problemas de configuração (não de
  código) apareceram e foram corrigidos: a `RESEND_API_KEY` inicial estava inválida (401 do
  Resend), e o remetente `RESEND_FROM_EMAIL` estava configurado com o domínio `placehub.app`
  (não verificado no Resend) em vez do domínio realmente verificado do tenant de teste,
  `casah.imb.br`.

### Adicionado (Taxa de transferência % e auto-atualização de saldo na calculadora de ágio, 2026-08-26)

- **Taxa de transferência em %** (`src/features/announcements/agio-calculator-dialog.tsx`): campo
  novo que divide o espaço do grid com "Custos de transferência" — cada empreendimento cobra uma
  taxa diferente sobre o valor de mercado atual (ex.: "2% do valor atualizado do contrato"), então
  em vez de digitar o custo fixo dá pra informar só o %, que preenche o campo de custo
  automaticamente (`useEffect` reagindo a `taxaTransferencia`/`valorMercado`, sem quebrar/mostrar
  NaN se o valor de mercado ainda não foi informado). O custo continua editável na mão depois — só
  volta a ser recalculado se a taxa ou o valor de mercado mudarem de novo.
- **Prestação + vencimento com recálculo automático de saldo**: campos "Valor da prestação" e "Dia
  de vencimento", mais uma `dataReferencia` interna (não editável, persistida no
  `agio_calculation` jsonb) marcando até quando "já pago"/"saldo devedor" estão em dia. Toda vez
  que a calculadora é aberta, conta quantos vencimentos passaram desde a última atualização
  (`countElapsedInstallments`, mês a mês, cobre qualquer intervalo — não só o mesmo ano) e já soma
  a(s) prestação(ões) vencida(s) em "já pago" e desconta de "saldo devedor" antes de exibir, com um
  aviso mostrando quantas parcelas venceram e desde quando. Mantém os valores em dia sozinho
  enquanto o anúncio de Cessão fica parado sem edição, até a venda ser fechada. `dataReferencia` só
  avança de fato quando o usuário clica "Aplicar" (Cancelar não persiste o recálculo).

### Corrigido (bug real de plataforma — Radix Select perdia valor em qualquer edição, 2026-08-25/26)

- **Achado enquanto testava a calculadora de ágio, mas afetava toda edição do sistema**:
  qualquer `<Select>` (shadcn/Radix) aninhado num `<form>` — ou seja, praticamente todo select do
  app — perdia silenciosamente o valor sempre que esse valor mudava pra algo cujo `SelectItem`
  nunca tinha sido renderizado com o dropdown aberto (o caso normal de `reset()` carregando um
  registro existente pra editar, ou de selecionar um item recém-criado). Causa raiz: o Radix
  Select mantém um `<select>` nativo oculto pra compatibilidade de formulário
  (`SelectBubbleInput`) que tenta sincronizar o value controlado nele via
  `nativeSelectElement.value = novoValor`; quando não existe uma `<option>` correspondente
  (porque o `SelectItem` nunca foi montado), o navegador reseta o `<select>` nativo pra `""`
  silenciosamente e dispara um evento `change`, que o Radix repassa como `onValueChange("")` —
  sobrescrevendo o valor real com uma string vazia, sem nenhum erro visível. Corrigido uma vez só,
  pra sempre, em `src/components/ui/select.tsx` (o wrapper `Select` compartilhado): ignora
  qualquer `onValueChange("")`, já que nenhuma tela do sistema usa string vazia como valor
  legítimo (sempre um sentinel tipo `"__none__"` pra "nada selecionado"). Achado e confirmado ao
  testar o botão "+" de criação rápida (ver adição abaixo) — mas o mesmo bug afetava silenciosamente
  o carregamento de **qualquer** tela de edição com Select preenchido por `reset()` (ex.: editar um
  corretor com UF/conta vinculada já definidas). Testado ponta a ponta em dois formulários
  completamente diferentes (anúncio e corretor) depois da correção, sem regressão.

### Adicionado (Calculadora de ágio e cadastro rápido nos vínculos do anúncio, 2026-08-25/26)

- **Calculadora de ágio** (`src/features/announcements/agio-calculator-dialog.tsx`): botão ao
  lado do campo "Tipo de imóvel" no formulário de anúncio, visível só quando o tipo é
  **"Cessão (Ágio)"** (`property_type = 'assignment'` — renomeado de "Cessão" pra deixar clara a
  equivalência com o sistema Laravel anterior, que rotulava esse mesmo campo literalmente
  "Ágio"). Abre um diálogo com as perguntas necessárias — valor original do contrato, valor já
  pago, saldo devedor restante, valor de mercado atual (opcional) e custos de transferência
  (opcional), mais uma margem % desejada — e calcula ao vivo: valorização estimada, base de
  cálculo, ágio sugerido e valor total da transação. Botão "Aplicar" grava o valor sugerido no
  campo Preço **e persiste os dados da calculadora** (`announcements.agio_calculation`, coluna
  jsonb nova — `20260825120000_announcement_agio_calculation.sql`) — reabrir a calculadora numa
  edição futura já vem preenchida com o que foi usado da última vez, pro corretor ajustar quando
  o proprietário mudar alguma informação. Fórmula e escopo (financiamento bancário/construtora,
  não consórcio) confirmados com o usuário antes de implementar — não existia nada equivalente no
  sistema anterior.
- **Coerência Tipo de imóvel × Transação**: ao escolher "Cessão (Ágio)", o campo Transação vira
  texto fixo "Venda (cessão é sempre venda)" em vez de select — cessão nunca é aluguel — e o valor
  é forçado pra `sale` automaticamente.
- **Cadastro rápido nos 4 vínculos do anúncio** (Empreendimento/Parceiro/Proprietário/Corretor):
  botão "+" ao lado de cada select abre o mesmo diálogo de criação já usado nas respectivas
  telas de cadastro (`onCreated` novo, opcional, nesses 4 componentes), sem sair do formulário de
  anúncio — o novo registro é selecionado automaticamente assim que criado. As 4 mutações de
  criação (`useCreateOwner`/`useCreatePartner`/`useCreateDevelopment`/`useCreateBroker`) passaram
  a atualizar o cache do React Query na hora (`setQueryData`, além do `invalidateQueries` de
  sempre) — não é só otimização, evita uma corrida onde o registro novo ainda não está na lista
  no exato momento em que o formulário tenta selecioná-lo.

### Adicionado (6ª rodada de melhorias, pós-Fase 4, 2026-08-25)

- **Menu aninhado em "Comercial" e "Administração"** (`src/features/tenant/tenant-layout.tsx`),
  replicando a estrutura do sistema anterior (`layouts/navigation.blade.php`): o cabeçalho não
  tinha mais espaço pra uma opção de menu por módulo (13 módulos possíveis num tenant com tudo
  liberado). "Painel" e "Anúncios" continuam soltos no topo (como no sistema antigo); Comercial
  agrupa Leads/Reservas/Negociações/Vendas/Comissões/Relatórios; Administração agrupa
  Empreendimentos/Parceiros/Corretores/Proprietários/Usuários/Identidade visual (Proprietários
  entra aqui — não existia no sistema antigo). Cada grupo só aparece se o usuário tiver permissão
  pra pelo menos um item dentro dele; o botão do grupo fica em destaque quando a rota atual
  pertence a ele.
- **Ver/ocultar senha** (`src/components/password-input.tsx`, componente `PasswordInput`) em
  todo campo de senha do sistema: login, criar usuário, editar usuário (nova senha), vincular
  administrador de tenant.
- **Regras de formação de senha com checklist ao vivo**
  (`src/lib/password.ts` + `src/components/password-requirements.tsx`): mínimo 8 caracteres, uma
  minúscula, uma maiúscula, um número, um caractere especial — cada regra "tica" conforme o
  usuário digita. Aplicado nos 3 formulários que criam/alteram senha (criar usuário, vincular
  administrador, nova senha na edição de usuário — neste último só quando o campo não está em
  branco, já que em branco significa manter a senha atual).

### Adicionado (Fase 4 — Comissões, relatórios e dashboard, completa, 2026-08-27/25)

- **Comissões e repasses** (`commissions`, `commission_installments`,
  `20260827090000_commissions_and_audit.sql`): comissão nasce junto com a venda — a função
  `create_sale_from_proposal` (Fase 3) ganhou o parâmetro `p_commission_percentage` (default 5%),
  calcula o corte do corretor via `min(brokers.commission_percentage, percentual total)`, distribui
  bruto/corretor/imobiliária pro-rata nas parcelas de entrada (último item absorve o resto do
  arredondamento). Ciclo de repasse com confirmação do corretor, replicando o sistema antigo:
  `register_broker_commission_payment` (só `tenant_admin`, exige que a entrada já tenha sido
  recebida do cliente) → `confirm_broker_commission_receipt` (só o próprio corretor, via
  `current_broker_id()`). `/commissions`, `/commissions/:id` com ação contextual por papel e
  upload de comprovante (bucket `sale-documents` reaproveitado, policies ampliadas pra aceitar
  `commissions` além de `sales`). Corrigidos dois problemas reais durante a aplicação da migration:
  cache do PostgREST desatualizado (`notify pgrst, 'reload schema'`) e o mesmo bug de alias
  ambíguo em `plpgsql` já visto na Fase 3 (`v_item` colidindo com a variável declarada), desta vez
  na soma dos bens dados como parte de pagamento. Testado ponta a ponta com valores conferidos em
  cada etapa: venda de R$1.000.000, comissão total 10%, corte do corretor 5% (R$50.000 pra cada
  lado), RLS confirmada (corretor só vê a própria comissão).
- **Auditoria** (`audit_logs`): `write_audit_log()` (`security definer`, escrita só via função)
  chamado por todas as funções de venda/comissão (`sale_created`, `sale_cancelled`,
  `entry_received`, `broker_payment_registered`, `broker_receipt_confirmed`). Seção "Atividades"
  em `/sales/:id`, mais recente primeiro. Testado ponta a ponta.
- **Dashboard real** (`/dashboard`, `src/features/tenant/dashboard-api.ts`): substitui o
  placeholder da Fase 1. Filtro de período (mês atual/anterior/ano atual/personalizado, mesmo
  `resolvePeriod()` do sistema antigo replicado em JS), cards administrativos por permissão,
  métricas comerciais (leads, negociações ativas, propostas, vendas, comissão) — sem filtro manual
  de corretor no client: a RLS já restringe `leads`/`negotiations`/`proposals`/`sales`/`commissions`
  aos próprios registros do corretor, então a mesma query naturalmente retorna dados diferentes por
  papel. Próximos contatos (atrasado/hoje/em breve), atividades recentes, ranking de corretores por
  valor vendido (Recharts, gráfico de barras simples). Testado ponta a ponta como `tenant_admin`.
- **Relatórios** (`/reports`, `src/features/reports/`): porta o `ReportController` do sistema
  antigo — 5 tipos (Vendas, Comissões, Recebimentos, Corretores, Leads), cada um com filtro de
  período/corretor/status e cards de resumo (mesma lógica de `summary()` do antigo). Impressão via
  `window.print()` + CSS `@media print` em vez de rota/view separada (simplificação deliberada
  numa SPA — mesmo resultado visual, sem duplicar tela): esconde nav/filtros/botões do `AppShell`
  fixo e libera o `<main>` pro fluxo normal de página impressa. Testado ponta a ponta nos 5 tipos,
  dados conferidos contra os mesmos registros de QA usados no dashboard e nas comissões.

**Fase 4 completa** — comissões (com confirmação do corretor), auditoria, dashboard real e
relatórios com impressão funcionando ponta a ponta contra o Supabase real.

### Adicionado (Fase 3 — Funil comercial, completa, 2026-08-24/26)

- **Fundação do banco** (`20260824100000_create_commercial_funnel.sql`): 8 tabelas (`leads`,
  `lead_follow_ups`, `negotiations`, `proposals`, `sales`, `sale_entry_installments`,
  `sale_payment_assets`, `reservations`), enums de status, triggers de sincronismo entre elas
  (lead↔negociação, proposta↔negociação, follow-up concluído avança o lead), trava financeira de
  venda concluída, RLS com corretor restrito aos próprios registros. Pesquisado o sistema Laravel
  antigo antes de desenhar — domínio já bem pensado lá, portado fielmente com duas garantias que
  passam a viver no banco (antes só em código de aplicação): reserva ativa única por anúncio
  (índice único parcial) e proposta aceita não pode ser excluída (trigger).
- **Leads + Agenda** (`/leads`, `/leads/:id`): CRUD de leads, follow-ups de contato
  (agendar/concluir com resultado/reagendar), aba "Agenda" com worklist do tenant inteiro
  (em aberto/atrasados/concluídos/todos) — replica o `CommercialAgendaController` do sistema
  antigo. Testado ponta a ponta.
- **Negociações** (`/negotiations`, `/negotiations/:id` como hub): CRUD, troca de status com
  sincronismo automático pro lead (trigger no banco). Corrigido um bug real de tipo encontrado no
  teste: `CASE` com múltiplos ramos de string resolve pro tipo `text`, não pro `unknown` que um
  literal único casta implicitamente — Postgres rejeitava a atribuição a uma coluna enum (`column
  "status" is of type lead_status but expression is of type text`). Corrigido nas duas funções de
  sincronismo com cast explícito (`20260825090000_fix_funnel_status_sync_casts.sql`). Testado
  ponta a ponta.
- **Propostas**: CRUD embutido no hub de Negociação (`src/features/proposals/proposal-list.tsx`,
  sem rota própria — decisão de produto). Aceitar uma proposta sincroniza a negociação
  automaticamente (trigger); confirmado ponta a ponta.
- **Reservas** (`/reservations`, ação "Reservar" em Anúncios e no hub de Negociação): funções SQL
  transacionais `reserve_announcement`/`cancel_reservation` (únicas portas de escrita — sem
  INSERT/UPDATE direto pelo client), mantendo `announcements.status` sincronizado
  (published ⇄ reserved) sempre dentro da mesma transação. Expiração automática via `pg_cron`
  chamando `run_funnel_expirations()` a cada minuto — decisão de arquitetura revisada: função SQL
  direto em vez do "pg_cron + Edge Function" especulado antes de qualquer desenho real (um salto
  a menos, sem depender de HTTP dentro do banco); a mesma migration já cobre a expiração
  automática de propostas vencidas também (`20260825100000_reservations_functions.sql`). Testado
  ponta a ponta.
- **Vendas** (`/sales`, `/sales/:id`, ação "Fechar venda" no hub de Negociação a partir de uma
  proposta aceita): função SQL transacional `create_sale_from_proposal` — calcula financiamento
  no servidor (nunca aceito do client), valida soma das parcelas de entrada, converte a reserva
  ativa em `converted` quando houver. `cancel_sale` (só `tenant_admin`) reverte
  negociação/anúncio. `receive_installment` marca parcela recebida com upload de comprovante
  (bucket privado `sale-documents`, leitura via signed URL). Trava de campos financeiros de venda
  concluída via trigger (já existia desde a fundação). Corrigido mais um bug real de SQL
  encontrado no teste: alias `v_item` da cláusula `FROM jsonb_array_elements(...)` colidia com a
  variável `plpgsql` de mesmo nome (`column reference "v_item" is ambiguous`) — renomeado o alias
  (`20260826090000_sales_functions.sql`). Testado ponta a ponta: fechar venda, cálculo de
  financiamento, receber parcela, cancelar com reversão completa.

**Fase 3 completa** — funil comercial (leads → negociação → proposta → reserva → venda)
funcionando de ponta a ponta contra o Supabase real.

### Adicionado (5ª rodada de melhorias pós-Fase 2, 2026-08-24)

- Edição de usuário do tenant ganhou os campos **Nova senha**/**Confirmar nova senha**
  (opcionais — em branco mantém a senha atual). Cobre o caso de um usuário esquecer a senha e o
  `tenant_admin` precisar redefinir: nova Edge Function `reset-tenant-user-password`, mesmo
  padrão de autorização de `update-tenant-user-email` (Admin API, só `tenant_admin`, só dentro
  do próprio tenant).

### Corrigido (4ª rodada de melhorias pós-Fase 2, 2026-08-24)

- **Cor da borda (Identidade visual) só era aplicada visualmente dentro da própria tela de
  Identidade visual, nunca nos outros módulos.** Causa: `Card`, `Dialog`, `Select`, `Popover` e
  `DropdownMenu` (`src/components/ui/*.tsx`) usavam um contorno fixo (`ring-foreground/10`, ring
  de 10% de opacidade sobre a cor do texto) em vez de reagir à cor de borda configurável do
  tenant — como praticamente toda tela do sistema é composta de `Card`s, o efeito prático era
  "a cor de borda não muda nada". Trocado pra `ring-border` (referencia a mesma variável `--border`
  que tabelas, inputs e cabeçalho já usavam corretamente) nos 5 componentes.
- Valor de condomínio (e IPTU, já que estava no mesmo caso) preenchido no cadastro do anúncio
  nunca aparecia em lugar nenhum pro visitante — o campo salvava certinho, só não tinha exibição.
  Adicionado na página pública de detalhe do anúncio, abaixo do preço, exibido só quando
  preenchido ("quando houver").

### Adicionado (3ª rodada de melhorias pós-Fase 2, 2026-08-23)

- Edição de usuário do tenant agora permite corrigir o **e-mail de login** (antes só dava pra
  ver, não editar) via nova Edge Function `update-tenant-user-email` (usa `auth.admin.
  updateUserById`, já que `auth.users.email` não pode ser alterado pelo client direto — a
  policy é a mesma de `invite-tenant-user`: só `tenant_admin`, e só dentro do próprio tenant).
- Convite de novo usuário do tenant agora aceita **CRECI e UF do CRECI** (antes só dava pra
  informar depois, editando um corretor separadamente) — `profiles` ganhou a coluna
  `creci_state` (migration `20260823140000_add_creci_state_to_profiles.sql`), que faltava (só
  `brokers.creci_state` existia).
- Definido o fluxo de branches por fase: durante o desenvolvimento de uma fase, os commits
  continuam indo direto pra `trunk`; ao concluir a fase, cria-se uma branch de snapshot
  (`fase-N-nome-curto`) a partir do commit final da trunk, sem trocar de branch de trabalho.
  `fase-2-catalogo` já criada a partir do estado da Fase 2 completa.

### Adicionado (2ª rodada de melhorias pós-Fase 2, 2026-08-23)

- **Mais padrões novos pra todo o sistema:**
  - `PhoneInput`/`formatPhone` (`src/components/phone-input.tsx`, `src/lib/phone.ts`): máscara
    de telefone `(XX) X XXXX-XXXX` (celular) / `(XX) XXXX-XXXX` (fixo), progressiva enquanto
    digita. Aplicado em Parceiros, Proprietários, Corretores, Imobiliárias e Usuários do tenant.
  - `DocumentInput` (`src/components/document-input.tsx`): mesma ideia pra CPF/CNPJ
    (`XXX.XXX.XXX-XX` / `XX.XXX.XXX/XXXX-XX`), reaproveitando `formatDocument()` (que passou a
    formatar progressivamente, não só quando o documento está completo). Aplicado em Parceiros,
    Proprietários e Corretores.
  - `capitalizeName()` (`src/lib/capitalize.ts`): capitaliza campos "Nome" ao sair do campo,
    mantendo minúsculas as preposições de ligação comuns em nomes (de/da/das/do/dos/e) — exceto
    quando são a primeira palavra. Aplicado em Empreendimentos, Parceiros, Proprietários,
    Corretores, e nos formulários de usuário (convidar/editar/vincular administrador).
  - Diálogos (`Dialog`) de todo o sistema agora só fecham por **Cancelar**, **Salvar/Criar** ou
    o **X** — clique fora ou Esc não fecham mais (evita perder dados preenchidos sem querer).
    Onde faltava, foi adicionado um botão **Cancelar** explícito (ex.: Corretores).
  - Colunas de ação nas listagens (Empreendimentos, Parceiros, Corretores, Proprietários,
    Imobiliárias, Usuários do tenant) padronizadas como ícones (lápis pra editar), sem mais texto
    "Editar"/"Excluir" — a listagem de Imobiliárias trocou o menu suspenso de duas ações por dois
    ícones diretos na linha (editar + vincular administrador).
- Anúncios marcados como "Destaque" e/ou "Promoção" agora mostram isso pro visitante: badge no
  card da home pública (já existia só pra Destaque) e na listagem interna de anúncios.

### Alterado (2ª rodada de melhorias pós-Fase 2, 2026-08-23)

- Clicar na linha de uma listagem (Anúncios, Empreendimentos, Parceiros, Corretores,
  Proprietários) não abre mais a edição — só o ícone de lápis abre. Antes a linha inteira era
  clicável, o que atrapalhava selecionar texto ou clicar por engano.
- Link "Voltar para anúncios" na tela de editar/criar anúncio virou só "Voltar".

### Adicionado (rodada de melhorias pós-Fase 2, 2026-08-23)

- **Padrões novos pra todo o sistema:**
  - `FieldLabel` (`src/components/field-label.tsx`): label de campo com ícone de ajuda (tooltip)
    opcional — aplicado nos formulários de Empreendimentos, Parceiros, Corretores,
    Proprietários, Anúncios, Imobiliárias (plataforma) e Usuários do tenant.
  - `CurrencyInput` (`src/components/currency-input.tsx`): máscara monetária "R$ 0,00" (dígitos
    entram da direita, como numa maquininha) — aplicado em Preço, Preço promocional, Condomínio
    e IPTU do formulário de anúncios.
  - `TenantBrand`/`useTenantLogo` (`src/features/tenant-branding/tenant-brand.tsx`): logo **e**
    nome do tenant lado a lado em todo header (login, painel do tenant, portal público, detalhe
    de anúncio, corretores) — antes mostrava só o logo OU só o nome, nunca os dois.
- CEP com autopreenchimento via ViaCEP (`src/lib/viacep.ts`, API pública gratuita, sem chave) no
  formulário de anúncios — sai do campo CEP e rua/bairro/cidade/UF preenchem sozinhos.
- Página de detalhe do anúncio (portal público) redesenhada seguindo o layout do sistema
  anterior: card de cabeçalho (badges, título, preço, botão "Falar com um corretor" — popover
  com todos os corretores ativos, o vinculado ao anúncio primeiro), grid de 2 colunas
  (características + descrição + amenidades à esquerda, galeria de fotos + vídeo à direita).
  Galeria com **lightbox de verdade**: foto principal + miniaturas clicáveis, visualizador em
  tela cheia com setas, teclado (← → fecha com Esc) e contador "X / Y" — replicado do
  comportamento Alpine.js do sistema anterior, agora em React puro.
- Hero de "publicidade da imobiliária" na home pública, usando `background_image_path` — campo
  que existia desde a Fase 1 mas nunca tinha sido aplicado em lugar nenhum (só ficava salvo no
  banco). O sistema anterior não tinha nada parecido (só um hero com texto fixo igual pra todo
  tenant, sem imagem); o novo usa a imagem de fundo do tenant (ou um gradiente com as cores da
  marca, se não houver imagem) + nome + CTA de WhatsApp + link pra corretores.
- Login mostra o link "Anúncios" (portal público) quando acessado a partir de um subdomínio de
  tenant — antes, depois de sair da conta, não tinha como voltar pro portal sem editar a URL.
- Coluna de ações (editar/excluir com ícones) na listagem de Anúncios — antes só dava pra editar
  clicando na linha, e não tinha excluir na listagem (só dentro do formulário).

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

- **Fase 2 (Catálogo) fechada.** Anúncios/imóveis (`/announcements`, permissão `announcements`):
  formulário em abas (dados básicos, endereço, características, amenidades, mídia); galeria com
  upload múltiplo e capa unificada via `is_cover` (sem coluna solta duplicada como no sistema
  anterior); amenidades por checkbox reaproveitando o catálogo `amenities`; publicação validada
  por trigger no banco — `status = 'published'` exige descrição, cidade, UF, preço válido e capa,
  e a exceção do Postgres chega como mensagem legível no toast, não só um erro genérico. RLS
  restringe corretores sem papel admin/manager a enxergar só os próprios anúncios (responsável ou
  vinculado como corretor) — regra que no sistema anterior só existia numa Policy de aplicação,
  agora garantida no banco. Portal público reescrito: home (`/`) lista anúncios publicados
  agrupados por tipo de imóvel; `/anuncios/:slug` é o detalhe (galeria, vídeo com embed de
  YouTube/Vimeo, características, amenidades, contato via WhatsApp); `/corretores` e
  `/corretores/:slug` são a listagem e o perfil público de corretor, com os anúncios dele. Testado
  ponta a ponta como visitante genuinamente anônimo (zero cookies, sem login).
- **Fase 2 (Catálogo) iniciada.** Fundação: helper `has_permission(module)` (RLS reutilizável —
  `tenant_admin`/`super_admin` sempre têm acesso, `manager`/`broker` só se o módulo estiver em
  `profile_permissions`), catálogo `amenities` (mesmo padrão de `permissions`), permissão
  `owners` que faltava desde a Fase 1, bucket `catalog-media` (fotos de corretor/galeria de
  anúncio). `useProfile()` agora traz `permissions: string[]` junto do profile; nova função
  `hasPermission(profile, module)` no client espelha a regra do banco pra montar nav/rotas sem
  mostrar algo que a API vai recusar (RLS continua sendo quem garante de verdade).
- Empreendimentos (`/developments`, permissão `developments`): CRUD completo (nome, tipo,
  incorporadora, status), slug gerado com sufixo aleatório e **escopado por tenant**
  (`unique(tenant_id, slug)` — no sistema anterior o slug de empreendimento era único
  globalmente). Link no menu do tenant liberado por `hasPermission()`, não mais restrito a
  `tenant_admin` — primeiro módulo a fechar esse gap (permissões existiam desde a Fase 1 mas
  nunca eram checadas em lugar nenhum). Testado ponta a ponta.
- Parceiros (`/partners`, permissão `partners`): CRUD completo (nome, PF/PJ, documento,
  telefone, e-mail, observações, ativo/inativo). Validação real de CPF/CNPJ por dígito
  verificador (`src/lib/cpf-cnpj.ts`, mesma checagem que o sistema anterior tinha no back-end,
  agora também no client antes de gastar uma chamada) e `unique(tenant_id, document)` — o
  sistema anterior não impedia parceiro duplicado. Testado ponta a ponta (CPF inválido barrado
  no form, CPF válido salva e formata a máscara na listagem).
- Corretores (`/brokers`, permissão `brokers`): CRUD completo com foto (upload direto pro bucket
  novo `catalog-media`, mesmo padrão de path-prefix por tenant do `tenant-branding`), CPF (mesma
  validação real de dígito verificador), CRECI/UF com `unique(tenant_id, creci, creci_state)`,
  comissão (%, default 2), bio, ativo/inativo, e vínculo opcional com uma conta de login
  (`profile_id`, substitui o `user_id` do sistema anterior — só lista profiles com role `broker`
  ainda não vinculados a outro corretor). Slug com sufixo aleatório escopado por tenant (o
  sistema anterior usava sufixo incremental só pra corretor, inconsistente com o resto —
  padronizado). RLS já libera leitura pública de corretores ativos (a tela pública vem na etapa
  de Anúncios). Testado ponta a ponta, incluindo envio de foto logo após criar o corretor.
- Proprietários (`/owners`, permissão `owners`): CRUD completo, construído do zero — no sistema
  anterior essa tabela era um scaffold morto (só `id`/timestamps, sem `tenant_id`, controller
  vazio, sem rota registrada, nunca ligada a nenhum anúncio). Mesmo formato de Parceiros
  (PF/PJ, documento validado, `unique(tenant_id, document)`). Testado ponta a ponta. Com isso,
  as 4 entidades de apoio do catálogo estão prontas — só falta Anúncios/imóveis, que amarra
  todas elas.
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

- Salvar um anúncio (criar ou editar) mantinha o usuário na tela de edição em vez de voltar pra
  listagem — agora os dois fluxos voltam pra `/announcements` depois de salvar, igual ao resto
  do sistema (Empreendimentos, Parceiros, Corretores, Proprietários já fechavam o dialog ao
  salvar).
- Toasts de erro mostravam "[object Object]" quando o erro vinha do Postgres/PostgREST (objeto
  simples com `.message`, não `instanceof Error`) — só apareciam corretamente erros que já eram
  `Error` de verdade (ex. de rede). Novo helper `errorMessage()` (`src/lib/errors.ts`), aplicado
  nos 16 lugares que tinham esse padrão — encontrado testando o trigger de validação de
  publicação de anúncio, onde o toast finalmente mostra a mensagem real do banco.
- CRECI sem UF preenchida mostrava um "/" solto no final ("12345/") nas páginas públicas de
  corretor (mesma causa raiz do bug já corrigido na listagem interna, mas essa cópia específica
  ficou faltando).
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

