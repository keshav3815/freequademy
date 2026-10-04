# Runbook — incidents

**Incident owner: UNKNOWN — REQUIRES OWNER DECISION (D8).** Until named, the repository owner is the fallback.

| Symptom | First checks | Action |
|---|---|---|
| Users on Jio/Airtel/ACT cannot load data | `curl -I https://<ref>.supabase.co/auth/v1/health` from an affected network vs. another network | If only the vendor domain fails: ensure clients use `api.freequademy.com` (gateway runbook) |
| Spike of client errors | Admin → System health → Client errors (group, route, release) | Roll back the Vercel deployment for that release |
| Jobs dead-lettered | System health → Background jobs → last error | Fix cause, requeue (jobs runbook) |
| Suspected bad migration | Compare `supabase_migrations.schema_migrations` with the repo | Apply the matching file in `supabase/rollbacks/` on staging first, then production |
| Data loss / corruption | Stop writes (pause the project or put the app in maintenance) | Restore runbook; never restore over the damaged project |
| Fake or suspicious payments | `select * from donations order by created_at desc` | Payment code is removed; check no payment Edge Function is deployed (`supabase functions list`) |

Every incident: note start time, detection, actions, end time, and the request IDs involved; add the timeline to `docs/architecture/incidents/`.
