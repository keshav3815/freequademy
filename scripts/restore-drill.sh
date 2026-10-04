#!/usr/bin/env bash
# Restore drill (Architecture V1 Phase 0): proves a backup from scripts/backup.sh
# can actually be restored, and measures how long it takes (RTO evidence).
#
#   BACKUP_PRIVATE_KEY=~/.config/freequademy/backup-key.pem scripts/restore-drill.sh <file.tar.cms> [report.json]
#
# Restores into a throwaway Postgres container running production's Supabase
# image — never into a real project — then checks:
#   * every table's row count equals the manifest recorded at backup time
#   * every foreign key holds (no orphaned rows)
#   * table / function / policy / index counts match
# Prints a JSON report; exits non-zero if any check fails.
set -euo pipefail

BACKUP="${1:?usage: scripts/restore-drill.sh <file.tar.cms> [report.json]}"
REPORT="${2:-}"
: "${BACKUP_PRIVATE_KEY:?set BACKUP_PRIVATE_KEY to the backup private key file}"
IMAGE="${SUPABASE_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.4.1.075}"
# Auth and Storage own their schemas; the drill runs the same service versions
# so their tables exist with production's columns before data is restored.
# Match these to production (dashboard → Settings → Infrastructure).
GOTRUE_IMAGE="${GOTRUE_IMAGE:-public.ecr.aws/supabase/gotrue:v2.188.1}"
STORAGE_IMAGE="${STORAGE_IMAGE:-public.ecr.aws/supabase/storage-api:v1.54.1}"
NAME="freequademy_restore_drill_$$"
NET="${NAME}_net"
WORK="$(mktemp -d)"
chmod 700 "$WORK"
cleanup() {
  docker rm -f "$NAME" "${NAME}_auth" "${NAME}_storage" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

t0=$(date +%s)
openssl cms -decrypt -binary -inform DER -in "$BACKUP" -inkey "$BACKUP_PRIVATE_KEY" -out "$WORK/backup.tar"
tar -C "$WORK" -xf "$WORK/backup.tar"
t_decrypt=$(date +%s)

pull() { docker image inspect "$1" >/dev/null 2>&1 || docker pull -q "$1" >/dev/null 2>&1 || { docker pull -q "${1#public.ecr.aws/}" >/dev/null && echo "${1#public.ecr.aws/}" && return; }; echo "$1"; }
IMAGE="$(pull "$IMAGE")"; GOTRUE_IMAGE="$(pull "$GOTRUE_IMAGE")"; STORAGE_IMAGE="$(pull "$STORAGE_IMAGE")"

docker network create "$NET" >/dev/null
docker run -d --name "$NAME" --network "$NET" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null
for _ in $(seq 1 90); do
  docker exec "$NAME" psql -U postgres -h localhost -tAc "select to_regclass('auth.users')" 2>/dev/null | grep -q users && break
  sleep 2
done

# Throwaway credentials, valid only inside this drill's private network.
JWT_SECRET="$(openssl rand -hex 32)"
SERVICE_PW="$(openssl rand -hex 16)"
docker exec "$NAME" psql -U supabase_admin -d postgres -h localhost -X -q -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE supabase_auth_admin PASSWORD '$SERVICE_PW'" -c "ALTER ROLE supabase_storage_admin PASSWORD '$SERVICE_PW'" >/dev/null
jwt() { python3 - "$JWT_SECRET" "$1" <<'PY'
import base64, hashlib, hmac, json, sys
enc = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
head = enc(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
body = enc(json.dumps({"role": sys.argv[2], "iss": "restore-drill", "exp": 4102444800}).encode())
sig = enc(hmac.new(sys.argv[1].encode(), f"{head}.{body}".encode(), hashlib.sha256).digest())
print(f"{head}.{body}.{sig}")
PY
}
docker run -d --name "${NAME}_auth" --network "$NET" \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL="postgresql://supabase_auth_admin:$SERVICE_PW@$NAME:5432/postgres" \
  -e GOTRUE_JWT_SECRET="$JWT_SECRET" -e API_EXTERNAL_URL=http://localhost -e GOTRUE_SITE_URL=http://localhost \
  -e GOTRUE_API_HOST=0.0.0.0 -e PORT=9999 "$GOTRUE_IMAGE" >/dev/null
docker run -d --name "${NAME}_storage" --network "$NET" \
  -e DATABASE_URL="postgresql://supabase_storage_admin:$SERVICE_PW@$NAME:5432/postgres" \
  -e AUTH_JWT_SECRET="$JWT_SECRET" -e ANON_KEY="$(jwt anon)" -e SERVICE_KEY="$(jwt service_role)" \
  -e STORAGE_BACKEND=file -e FILE_STORAGE_BACKEND_PATH=/tmp -e TENANT_ID=stub -e GLOBAL_S3_BUCKET=stub \
  -e STORAGE_S3_REGION=local -e FILE_SIZE_LIMIT=52428800 -e ENABLE_IMAGE_TRANSFORMATION=false "$STORAGE_IMAGE" >/dev/null
# Wait until both services have finished migrating, then stop them: the
# restore and checks only need their schemas.
for _ in $(seq 1 90); do
  auth_ok=$(docker logs "${NAME}_auth" 2>&1 | grep -ciE "API started|starting API|listening" || true)
  storage_ok=$(docker logs "${NAME}_storage" 2>&1 | grep -ciE "listening|started successfully|Server listening" || true)
  [[ "$auth_ok" -gt 0 && "$storage_ok" -gt 0 ]] && break
  sleep 2
done
[[ "$auth_ok" -gt 0 ]] || { echo "Auth migrations did not complete:" >&2; docker logs "${NAME}_auth" 2>&1 | tail -20 >&2; exit 1; }
[[ "$storage_ok" -gt 0 ]] || { echo "Storage migrations did not complete:" >&2; docker logs "${NAME}_storage" 2>&1 | tail -20 >&2; exit 1; }
docker rm -f "${NAME}_auth" "${NAME}_storage" >/dev/null
t_ready=$(date +%s)

PSQL=(docker exec -i "$NAME" psql -U postgres -h localhost -X -q)
# Roles may already exist in the Supabase image; that is expected.
"${PSQL[@]}" -v ON_ERROR_STOP=0 < "$WORK/backup/roles.sql" >/dev/null 2>&1 || true
"${PSQL[@]}" -v ON_ERROR_STOP=1 < "$WORK/backup/schema.sql" >/dev/null
{ echo "SET session_replication_role = replica;"; cat "$WORK/backup/data.sql"; } | "${PSQL[@]}" -v ON_ERROR_STOP=1 >/dev/null
t_restored=$(date +%s)

docker cp "$WORK/backup/manifest.json" "$NAME:/tmp/manifest.json" >/dev/null
result=$(docker exec -i "$NAME" psql -U supabase_admin -d postgres -h localhost -X -q -A -t -v ON_ERROR_STOP=1 <<'SQL'
CREATE TEMP TABLE m AS SELECT pg_read_file('/tmp/manifest.json')::jsonb AS j;
WITH expected AS (
  SELECT key AS tbl, value::bigint AS rows FROM m, jsonb_each_text(j->'row_counts')
), actual AS (
  SELECT e.tbl, e.rows AS expected,
         (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %s', e.tbl), false, true, '')))[1]::text::bigint AS actual
    FROM expected e
), fk AS (
  SELECT format('%s.%s', conrelid::regclass, conname) AS fk,
         (xpath('/row/c/text()', query_to_xml(format(
           'SELECT count(*) AS c FROM %s child WHERE (%s) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %s parent WHERE (%s) = (%s))',
           conrelid::regclass,
           (SELECT string_agg(format('child.%I', a.attname), ', ') FROM unnest(conkey) k JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = k),
           confrelid::regclass,
           (SELECT string_agg(format('parent.%I', a.attname), ', ') FROM unnest(confkey) k JOIN pg_attribute a ON a.attrelid = confrelid AND a.attnum = k),
           (SELECT string_agg(format('child.%I', a.attname), ', ') FROM unnest(conkey) k JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = k)
         ), false, true, '')))[1]::text::bigint AS orphans
    FROM pg_constraint
   WHERE contype = 'f' AND connamespace IN ('public'::regnamespace, 'private'::regnamespace)
), objects AS (
  SELECT jsonb_build_object(
    'tables', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'r' AND n.nspname IN ('public', 'private')),
    'functions', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'private')),
    'policies', (SELECT count(*) FROM pg_policies WHERE schemaname IN ('public', 'storage')),
    'indexes', (SELECT count(*) FROM pg_indexes WHERE schemaname IN ('public', 'private'))) AS got
)
SELECT jsonb_build_object(
  'backup_created_at', (SELECT j->>'created_at' FROM m),
  'tables_checked', (SELECT count(*) FROM actual),
  'rows_restored', (SELECT sum(actual) FROM actual),
  'row_count_mismatches', (SELECT coalesce(jsonb_agg(jsonb_build_object('table', tbl, 'expected', expected, 'actual', actual)), '[]') FROM actual WHERE actual IS DISTINCT FROM expected),
  'foreign_keys_checked', (SELECT count(*) FROM fk),
  'foreign_key_violations', (SELECT coalesce(jsonb_agg(jsonb_build_object('fk', fk, 'orphans', orphans)), '[]') FROM fk WHERE orphans > 0),
  'objects_expected', (SELECT j->'objects' FROM m),
  'objects_restored', (SELECT got FROM objects))
SQL
)
t_verified=$(date +%s)

report=$(python3 - "$result" "$t0" "$t_decrypt" "$t_ready" "$t_restored" "$t_verified" <<'PY'
import json, sys
r = json.loads(sys.argv[1])
t0, t_dec, t_ready, t_rest, t_ver = map(int, sys.argv[2:])
r["timings_seconds"] = {"decrypt": t_dec - t0, "start_database": t_ready - t_dec, "restore": t_rest - t_ready, "verify": t_ver - t_rest, "total": t_ver - t0}
r["passed"] = not r["row_count_mismatches"] and not r["foreign_key_violations"] and r["objects_expected"] == r["objects_restored"]
print(json.dumps(r, indent=2))
PY
)
echo "$report"
[[ -n "$REPORT" ]] && echo "$report" > "$REPORT"
python3 -c 'import json,sys; sys.exit(0 if json.loads(sys.argv[1])["passed"] else 1)' "$report"
