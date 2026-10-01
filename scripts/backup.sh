#!/usr/bin/env bash
# Free logical backup of a Supabase project (Architecture V1 Phase 0, zero-cost).
# Replaces paid daily backups/PITR: run nightly by .github/workflows/backup.yml.
#
#   SUPABASE_DB_URL=postgresql://...  BACKUP_RECIPIENT_CERT=ops/backup-recipient.pem  scripts/backup.sh <out-dir>
#
# Produces <out-dir>/freequademy-<UTC timestamp>.tar.cms — roles, schema and data
# dumps (Supabase's documented `supabase db dump` method) plus a manifest of
# exact row counts, encrypted with AES-256-GCM to the recipient certificate.
# Only the holder of the matching private key can decrypt it; the public repo's
# artifact storage only ever sees ciphertext. The plaintext never touches disk
# outside a private temp directory that is wiped on exit.
set -euo pipefail

OUT_DIR="${1:?usage: scripts/backup.sh <out-dir>}"
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL (session pooler URI, percent-encoded)}"
CERT="${BACKUP_RECIPIENT_CERT:-ops/backup-recipient.pem}"
PSQL="${PSQL:-psql}"
SUPABASE="${SUPABASE:-npx --yes supabase@2}"
[[ -f "$CERT" ]] || { echo "recipient certificate not found: $CERT" >&2; exit 1; }

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK="$(mktemp -d)"
chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/backup" "$OUT_DIR"

started=$(date +%s)
echo "Dumping roles, schema and data…"
$SUPABASE db dump --db-url "$SUPABASE_DB_URL" --role-only -f "$WORK/backup/roles.sql"
$SUPABASE db dump --db-url "$SUPABASE_DB_URL" -f "$WORK/backup/schema.sql"
# supabase_functions.hooks is platform metadata for database webhooks (unused
# by the app; the schema is recreated by the platform, not by our migrations).
$SUPABASE db dump --db-url "$SUPABASE_DB_URL" --data-only --use-copy \
  -x supabase_functions.hooks -x supabase_functions.hooks_id_seq -f "$WORK/backup/data.sql"

echo "Recording exact row counts…"
$PSQL "$SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 > "$WORK/backup/manifest.json" <<'SQL'
SELECT jsonb_build_object(
  'created_at', now(),
  'postgres_version', current_setting('server_version'),
  'row_counts', (
    SELECT jsonb_object_agg(format('%I.%I', n.nspname, c.relname),
             (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint)
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname IN ('public', 'auth', 'private', 'storage')
       AND NOT (n.nspname = 'auth' AND c.relname IN ('audit_log_entries', 'flow_state', 'one_time_tokens', 'refresh_tokens', 'sessions', 'mfa_amr_claims'))),
  'objects', jsonb_build_object(
    'tables', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname IN ('public', 'private')),
    'functions', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'private')),
    'policies', (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public', 'storage')),
    'indexes', (SELECT count(*) FROM pg_indexes WHERE schemaname IN ('public', 'private'))));
SQL

tar -C "$WORK" -cf "$WORK/backup.tar" backup
openssl cms -encrypt -binary -aes-256-gcm -stream -outform DER \
  -in "$WORK/backup.tar" -out "$OUT_DIR/freequademy-$STAMP.tar.cms" "$CERT"

echo "Backup written: $OUT_DIR/freequademy-$STAMP.tar.cms ($(du -h "$OUT_DIR/freequademy-$STAMP.tar.cms" | cut -f1), $(( $(date +%s) - started ))s)"
