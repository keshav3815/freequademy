# Runbook — backups and restore (zero-cost)

**Targets:** RPO ≤ 24 h · RTO ≤ 4 h. Supabase Free has no backups and no PITR, so backups are ours.

## How it works

| Piece | What it does |
|---|---|
| `scripts/backup.sh` | `supabase db dump` roles, schema and data (Supabase's documented method; `supabase_functions` webhook metadata excluded) + a manifest of exact row counts and object counts → tar → **AES-256-GCM** encryption (OpenSSL CMS) to `ops/backup-recipient.pem` |
| `.github/workflows/backup.yml` | Runs the script nightly at 01:30 IST; keeps 30 encrypted artifacts. The repository is **public**, so only ciphertext is ever uploaded |
| `scripts/restore-drill.sh` | Decrypts a backup, starts a throwaway Postgres with production's Postgres/Auth/Storage versions, restores, then checks every row count against the manifest, every foreign key for orphans, and table/function/policy/index counts. Prints JSON with timings |
| `.github/workflows/restore-drill.yml` | Runs the drill weekly on the newest backup; stores the JSON report 90 days |

## One-time setup (owner)

1. Keep the private key safe. It was generated on the maintainer's machine at `~/.config/freequademy/backup-key.pem` (mode 600). Copy it into a password manager. **Without it no backup can be restored.**
2. GitHub → Settings → Secrets and variables → Actions:
   - Secret `SUPABASE_DB_URL` = production **session pooler** connection string (Supabase dashboard → Connect → Session pooler; percent-encode the password).
   - Secret `BACKUP_PRIVATE_KEY` = contents of the private key (only needed for the automated weekly drill; leave unset to run drills manually instead).
   - Variable `BACKUP_ENABLED` = `true`.
3. Run **Backup** manually once (Actions → Backup → Run workflow), then **Restore drill**.

Trade-off to accept or reject: storing `BACKUP_PRIVATE_KEY` in GitHub means a GitHub-account compromise exposes both ciphertext and key. Leaving it out keeps the key offline; then run the drill locally each month.

## Restore for real (incident)

1. Pick the newest good backup: Actions → Backup → latest successful run → download `freequademy-backup`.
2. Verify it first: `BACKUP_PRIVATE_KEY=<key> scripts/restore-drill.sh <file>.tar.cms` (must print `"passed": true`).
3. Restore into a **new** Supabase project (never over the damaged one): decrypt, then in order `psql <new-db-url> -f roles.sql` (errors for existing roles are expected), `-f schema.sql`, and `data.sql` prefixed with `SET session_replication_role = replica;`.
4. Deploy Edge Functions to the new project, set its secrets, point the gateway's `SUPABASE_ORIGIN` (and Vercel env vars) at it. Users sign in again (new JWT secret).
5. Record start/end times in the incident note; compare with RTO.

## Evidence

| Date | Source | Result |
|---|---|---|
| 2026-10-01 | Local stack (254 auth users, test data) | **Passed.** 61 tables / 1,368 rows restored with 0 count mismatches; 61 foreign keys, 0 orphans; 44 tables · 97 functions · 110 policies · 125 indexes matched; restore + verify 6 s (excluding image download) |
| — | Production | **Not yet run** — needs `SUPABASE_DB_URL` (owner action) |
