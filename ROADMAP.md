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
- [x] Identidade visual do tenant (logo claro/escuro, favicon, cor primária/destaque) — bucket
      `tenant-branding`, upload restrito ao próprio tenant via policy no path. Cores aplicadas
      via CSS vars escopadas (`--primary`/`--accent`) no painel do tenant e na home pública.
      Testado ponta a ponta.

Fase 1 completa, exceto o conteúdo real do dashboard (item acima), que é conteúdo da Fase 4 por
design — o placeholder atual já cumpre o papel desta fase (provar que auth/tenant/permissões
funcionam).

## Fase 2 — Catálogo

- [ ] Empreendimentos (`developments`).
- [ ] Proprietários (`owners`).
- [ ] Anúncios/imóveis (`announcements` + `announcement_images`), com portal público de
      visualização (`{slug}.placehub.app/anuncios/...`, sem login).
- [ ] Parceiros (`partners`).
- [ ] Corretores (`brokers`), com página pública de perfil.

## Fase 3 — Funil comercial

- [ ] Leads + agenda de contato (`leads`, `lead_follow_ups`).
- [ ] Negociações (`negotiations`).
- [ ] Propostas (`proposals`).
- [ ] Reservas de imóveis (`reservations`), com expiração automática (Edge Function +
      `pg_cron`) e conversão para venda num fluxo único e transacional.
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
