-- Corrige um bug real descoberto testando o agendamento em produção: o
-- timeout padrão do pg_net (5s, ver net.http_post) é bem menor que o tempo
-- real de gerar um backup completo (~53s pra ~150MB de fotos, medido no
-- backup manual do tenant CASAH) — quando o pg_net desistia e derrubava a
-- conexão, a Edge Function run-scheduled-backups era encerrada no meio,
-- sem nunca chegar no `finally` que destrava tenant_maintenance_state
-- (ficava travado pra sempre, só recuperável pela válvula de escape do
-- tenant_admin). cron.schedule com o mesmo jobname substitui a definição
-- anterior (não cria um job duplicado).
select cron.schedule(
  'run-scheduled-tenant-backups',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://pjaghnpdsocvcgfmtcqp.supabase.co/functions/v1/run-scheduled-backups',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
