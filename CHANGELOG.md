# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas no
formato AAAA-MM-DD.

## [Não lançado]

### Adicionado

- Scaffold do projeto: Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui (preset Nova),
  tema claro/escuro com `ThemeProvider` próprio.
- Cliente Supabase (`src/lib/supabase.ts`) com sessão persistida em cookie de domínio raiz
  (`src/lib/cookie-storage.ts`), para login único entre subdomínios.
- Migration inicial do banco (`tenants`, `profiles`, `permissions`, `profile_permissions`),
  com Row Level Security e funções auxiliares (`current_tenant_id`, `is_super_admin`,
  `is_tenant_admin`) e triggers de proteção (`guard_profile_privilege_change`,
  `guard_tenant_sensitive_change`).
- Documentação: README, ROADMAP, ARCHITECTURE, CONTINUITY.

