# Roadmap

Mapa de fases, não cronograma — sem datas. Cada fase deixa o app utilizável em algum grau;
não avançamos para a próxima até a atual estar de pé. Ao concluir um item relevante, registre
em [CHANGELOG.md](./CHANGELOG.md) e atualize [CONTINUITY.md](./CONTINUITY.md).

## Fase 0 — Fundação

- [x] Scaffold Vite + React + TypeScript.
- [x] Tailwind CSS v4 + shadcn/ui, tema claro/escuro (`ThemeProvider` próprio).
- [x] Cliente Supabase (`src/lib/supabase.ts`) com sessão em cookie de domínio raiz.
- [x] Schema inicial: `tenants`, `profiles`, `permissions`, RLS básica (migration
      `20260822004432_init_platform_schema.sql`).
- [x] Documentação de continuidade (README, ROADMAP, CONTINUITY, CHANGELOG, ARCHITECTURE).
- [x] Projeto Supabase real criado (nuvem) e credenciais em `.env.local`.
- [x] Migration inicial aplicada no projeto Supabase real (via SQL Editor).
- [ ] Projeto Vercel conectado ao repositório, com preview deployments.
- [ ] Domínio `placehub.app` com wildcard (`*.placehub.app`) apontando para a Vercel.
- [ ] CI (GitHub Actions): lint + typecheck + build em cada push/PR.
- [ ] Conta Resend criada e domínio de envio verificado.

## Fase 1 — Plataforma, autenticação e tenants

- [x] Tela de login única (mesmo formulário em qualquer subdomínio), com redirecionamento
      pós-login por role/tenant do `profile`. Testado ponta a ponta em `app.localhost`.
- [x] Resolução de tenant/plataforma por subdomínio (`src/lib/subdomain.ts`) no client.
- [x] Console da plataforma (`app.placehub.app`): listagem de tenants (somente leitura).
- [x] Home do tenant pública (placeholder "anúncios em breve"), login como rota própria
      (`/login`) em vez de gate global — mesmo comportamento do sistema anterior.
- [x] CRUD de tenants (criar/editar/ativar-desativar) no console da plataforma — direto no
      client, protegido por RLS (`tenants_insert`/`tenants_update`, super_admin only).
- [x] Criação do primeiro `tenant_admin` de cada tenant via Edge Function (`create-tenant-admin`)
      chamando a Admin API — substituiu o fluxo manual de SQL. Aplicada e testada ponta a ponta.
- [ ] Dashboard do tenant (vazio/placeholder até a Fase 4 trazer indicadores reais) — feito um
      placeholder mínimo; falta revisar quando a Fase 2+ trouxer conteúdo real.
- [x] Gestão de usuários do tenant (convite, papéis, permissões por módulo) — restrita a
      `tenant_admin`. Convite via Edge Function (`invite-tenant-user`); editar/ativar-desativar
      direto no client via RLS. Testado ponta a ponta.
- [x] Identidade visual do tenant — paridade completa com o sistema anterior: 15 cores (tema
      claro/escuro, aplicadas de fato em todo o app via `tenantThemeVars()`), fundo do logo com
      transparência, 5 imagens (logo claro/escuro, plano de fundo, favicon — funcional na aba do
      navegador, anúncio sem foto), restaurar padrão, preview por tema em card com xadrez de
      transparência. Bucket `tenant-branding`, upload restrito ao próprio tenant via policy no
      path. Testado ponta a ponta.
- [x] Cabeçalho/rodapé fixos com opacidade real (`AppShell`, `position: fixed`), conteúdo
      centralizado, replicando o padrão do sistema anterior.

Fase 1 completa (encerrada em 2026-08-23), exceto o conteúdo real do dashboard (item acima), que
é conteúdo da Fase 4 por design — o placeholder atual já cumpre o papel desta fase (provar que
auth/tenant/permissões funcionam).

## Fase 2 — Catálogo

- [x] Empreendimentos (`developments`) — CRUD completo (`/developments`, permissão `developments`
      via `has_permission()`), slug escopado por tenant. Testado ponta a ponta.
- [x] Parceiros (`partners`) — CRUD completo (`/partners`, permissão `partners`), PF/PJ com
      validação real de CPF/CNPJ (dígitos verificadores, `src/lib/cpf-cnpj.ts`),
      `unique(tenant_id, document)`. Testado ponta a ponta.
- [x] Corretores (`brokers`) — CRUD completo (`/brokers`, permissão `brokers`): foto (bucket
      `catalog-media`), CPF, CRECI/UF (`unique(tenant_id, creci, creci_state)`), comissão %,
      vínculo opcional com um profile (role `broker`, único por corretor). RLS já libera leitura
      pública de corretores ativos — a página pública em si (`/corretores`) vem na etapa de
      Anúncios. Testado ponta a ponta, incluindo upload de foto.
- [x] Proprietários (`owners`) — CRUD completo (`/owners`, permissão `owners`), construída do
      zero (no sistema anterior era um scaffold morto, sem tenant_id, sem rotas). Testado ponta
      a ponta.
- [x] Anúncios/imóveis (`announcements` + `announcement_images` + `announcement_amenities`) —
      CRUD completo em abas (`/announcements`, permissão `announcements`): dados básicos,
      endereço, características, amenidades, galeria com capa unificada (`is_cover`). Publicação
      validada por trigger no banco (descrição/cidade/UF/preço/capa obrigatórios pra
      `status = 'published'`). RLS restringe corretores sem papel admin/manager a só ver os
      próprios anúncios. Portal público (`/`, `/anuncios/:slug`, `/corretores`,
      `/corretores/:slug`) — listagem agrupada por tipo de imóvel, detalhe com galeria/vídeo/
      amenidades/contato via WhatsApp, perfil público de corretor com os anúncios dele. Testado
      ponta a ponta com um visitante genuinamente anônimo (sem sessão).

Fase 2 completa — as 5 entidades do catálogo (Empreendimentos, Parceiros, Corretores,
Proprietários, Anúncios) e o portal público estão no ar.

- [x] Rodada de polimento pós-Fase 2 (2026-08-23), a pedido do usuário: página de detalhe do
      anúncio redesenhada com layout do sistema anterior (galeria com lightbox de verdade — foto
      cheia, setas, teclado, contador), hero de "publicidade da imobiliária" na home pública
      usando `background_image_path` (nunca tinha sido aplicado em lugar nenhum), CEP com
      autopreenchimento (ViaCEP), máscara monetária "R$ 0,00" nos campos de preço, tooltip de
      ajuda em campo de formulário como padrão do sistema (`FieldLabel`), logo+nome do tenant
      juntos em todo header (antes só um ou outro), coluna de ações na listagem de anúncios,
      link "Anúncios" na tela de login, e correção do botão Salvar não voltando pra listagem.
      Testado ponta a ponta. Ver CHANGELOG.md.
- [x] 2ª rodada de polimento pós-Fase 2 (2026-08-23), a pedido do usuário: máscara de telefone
      `(XX) X XXXX-XXXX` e de CPF/CNPJ, capitalização automática de campos "Nome" (com exceção
      das preposições de ligação), diálogos só fecham por Cancelar/Salvar/X (não mais clicando
      fora ou Esc), colunas de ação padronizadas como ícones em todas as listagens (sem texto
      "Editar"/"Excluir"), badges de Destaque/Promoção visíveis pro visitante, linha da listagem
      não abre mais edição sozinha (só o ícone), link "Voltar" simplificado. Testado ponta a
      ponta. Ver CHANGELOG.md.

## Fase 3 — Funil comercial

- [x] Leads + agenda de contato (`leads`, `lead_follow_ups`) — CRUD (`/leads`), detalhe do lead
      (`/leads/:id`) com follow-ups (agendar/concluir/reagendar), aba "Agenda" (worklist do
      tenant inteiro, filtros em aberto/atrasados/concluídos/todos). Status do lead sincroniza
      automaticamente (trigger no banco): concluir um follow-up avança `new` → `contacted`.
      Testado ponta a ponta.
- [x] Negociações (`negotiations`) — CRUD (`/negotiations`), página de detalhe/hub
      (`/negotiations/:id`) com troca de status, anúncio/corretor/próximo contato editáveis.
      Status sincroniza com o lead automaticamente (trigger). Ainda sem Propostas dentro do hub
      (próximo passo). Testado ponta a ponta.
- [x] Propostas (`proposals`) — CRUD dentro do hub de Negociação (sem rota/página própria, por
      design: no sistema antigo nunca tinha uma tela de detalhe real). Status sincroniza com a
      negociação automaticamente (trigger). Testado ponta a ponta, incluindo o fluxo completo
      proposta aceita → negociação sincronizada.
- [x] Reservas de imóveis (`reservations`) — funções SQL transacionais
      (`reserve_announcement`/`cancel_reservation`, sem INSERT/UPDATE direto pelo client),
      `/reservations`, ação "Reservar" em Anúncios e no hub de Negociação. Expiração automática
      via `pg_cron` chamando função SQL direto (mais simples que o Edge Function especulado
      originalmente — sem salto HTTP a mais). Testado ponta a ponta (reservar → status do
      anúncio muda → cancelar → reverte). Conversão pra venda vem junto do próximo item.
- [ ] Vendas (`sales`, `sale_entry_installments`, `sale_payment_assets`), com trava de
      campos financeiros após conclusão.

## Fase 4 — Comissões, relatórios e dashboard

- [ ] Comissões e repasses (`commissions`, `commission_installments`), com confirmação do
      corretor.
- [ ] Auditoria (`audit_logs`) visível na tela de detalhes da venda.
- [ ] Dashboard com filtro de período e indicadores (leads, conversões, vendas, comissões).
- [ ] Relatórios (vendas, comissões, recebimentos, corretores, leads) com exportação/impressão.

## Fase 5 — E-mail e notificações

- [ ] Edge Function `send-email` (Resend) para: boas-vindas, nova reserva, comissão liberada,
      recibo de pagamento.
- [ ] Templates de e-mail com a identidade visual do tenant.

## Fase 6 — Polimento e observabilidade

- [ ] Testes Vitest para as regras de negócio críticas (conversão reserva→venda, trava de
      venda concluída, cálculo de comissão).
- [ ] Playwright para os fluxos principais (login, criar lead até venda).
- [ ] Monitoramento de erros no front (a decidir: Sentry ou equivalente).
- [ ] Revisão de acessibilidade (foco, contraste, navegação por teclado) nos temas claro/escuro.
- [ ] Domínio próprio por tenant (`custom_domain → tenant_id`), como evolução do roteamento
      por subdomínio.

## Backlog (não priorizado, registrado para não perder a ideia)

- `tenant_memberships` many-to-many (um login pertencer a vários tenants), caso a limitação
  atual (1 usuário = 1 tenant) vire um problema real — ver ARCHITECTURE.md.
- Migração de dados do sistema Laravel antigo, se algum tenant precisar entrar com histórico.
