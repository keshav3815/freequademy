# Runbook — background jobs

| Part | Where |
|---|---|
| Queue table, enqueue/claim/complete/fail, retries, dead letter | migration `20261001130000_…`; tests `019_jobs.test.sql` |
| SQL jobs (purges) | `private.run_sql_jobs()` every 5 min via pg_cron (`freequademy-run-sql-jobs`) |
| Daily maintenance enqueue | `private.enqueue_daily_maintenance()` at 02:00 IST (`freequademy-daily-maintenance`); idempotent per day |
| External jobs (webhooks) | Edge Function `worker`; handlers in `supabase/functions/worker/jobs.ts` |
| Health | Admin → System health, or `select * from public.get_job_health()` as an admin |

**Semantics:** `queued → running → succeeded`, or `running → retrying` (backoff 30 s, 60 s, 120 s … max 1 h) → … → `dead` after `max_attempts` (default 5). `(type, idempotency_key)` is unique, so enqueueing twice never runs a job twice. A dead job stays for inspection; re-run it with `update private.jobs set status = 'queued', attempt_count = 0, scheduled_at = now() where id = …` after fixing the cause.

## Enabling the worker (only when the first external job type is used)

1. Generate a secret: `openssl rand -hex 32`. Set it as Edge Function secret `WORKER_SECRET` and store it in Vault: `select vault.create_secret('<secret>', 'worker_secret');`
2. Set `WEBHOOK_ALLOWED_HOSTS` (comma-separated hostnames) as an Edge Function secret.
3. Deploy: `supabase functions deploy worker`.
4. Schedule (SQL editor):
   ```sql
   select cron.schedule('freequademy-worker', '* * * * *', $$
     select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/worker',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret',
                  (select decrypted_secret from vault.decrypted_secrets where name = 'worker_secret')),
       body := '{}'::jsonb)$$);
   ```

Free-plan budget: one call per minute = ~43,000 Edge Function invocations/month of the free 500,000.
