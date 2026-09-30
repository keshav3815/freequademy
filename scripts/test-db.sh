#!/usr/bin/env bash
# Runs the pgTAP RLS suite against a throwaway local Postgres.
#
#   scripts/test-db.sh            # start a disposable container, test, remove it
#   KEEP_DB=1 scripts/test-db.sh  # leave the container running for inspection
#
# It never talks to a hosted Supabase project: the database is a fresh local
# container built from Supabase's own Postgres image (auth schema, anon/
# authenticated roles and pgTAP included), and every migration in
# supabase/migrations is applied from scratch.
#
# `supabase test db` also works against `supabase start`; this script exists so
# CI and developers without the full local stack get the same result.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Pinned to the production Postgres version (Supabase project odawqbevdzpkwkxbggnf
# reports 17.4.1.075). 17.6.1.106 segfaults on any "permission denied for
# function" error, which 016_phase0_hardening exercises.
IMAGE="${SUPABASE_PG_IMAGE:-public.ecr.aws/supabase/postgres:17.4.1.075}"
NAME="freequademy_test_db_$$"
PSQL=(docker exec -i "$NAME" psql -U postgres -h localhost -v ON_ERROR_STOP=1 -q -X)

cleanup() {
  if [[ "${KEEP_DB:-0}" != "1" ]]; then
    docker rm -f "$NAME" >/dev/null 2>&1 || true
  else
    echo "Database left running in container $NAME"
  fi
}
trap cleanup EXIT

# Public ECR rate-limits anonymous pulls ("toomanyrequests"); retry, then fall
# back to the identical image on Docker Hub.
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  for attempt in 1 2 3; do
    docker pull -q "$IMAGE" >/dev/null 2>&1 && break
    if [[ "$IMAGE" == public.ecr.aws/* ]] && docker pull -q "${IMAGE#public.ecr.aws/}" >/dev/null 2>&1; then
      IMAGE="${IMAGE#public.ecr.aws/}"
      break
    fi
    echo "Image pull failed (attempt $attempt), retrying…"
    sleep $((attempt * 10))
  done
fi

echo "Starting disposable database ($IMAGE)…"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$NAME" psql -U postgres -h localhost -tAc 'select 1' >/dev/null 2>&1; then
    # the image runs its own init scripts after the server first accepts connections
    if docker exec "$NAME" psql -U postgres -h localhost -tAc "select to_regclass('auth.users')" 2>/dev/null | grep -q users; then
      break
    fi
  fi
  sleep 2
done
sleep 3

echo "Applying migrations…"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  # one transaction per migration, like `supabase db push`
  "${PSQL[@]}" --single-transaction < "$migration" >/dev/null 2>&1 || {
    echo "Migration failed: $(basename "$migration")"
    "${PSQL[@]}" --single-transaction < "$migration"
    exit 1
  }
done

docker cp "$ROOT/supabase/tests" "$NAME:/tmp/tests" >/dev/null

failed=0
total=0
for test in "$ROOT"/supabase/tests/database/*.test.sql; do
  rel="database/$(basename "$test")"
  output="$(docker exec -w /tmp/tests/database "$NAME" psql -U postgres -h localhost -X -q -t -A -f "/tmp/tests/$rel" 2>&1)" || true
  planned="$(grep -Eo '^1\.\.[0-9]+' <<<"$output" | head -1 | cut -d. -f3)"
  passed="$(grep -Ec '^ok ' <<<"$output" || true)"
  notok="$(grep -Ec '^not ok ' <<<"$output" || true)"
  errors="$(grep -E 'ERROR|psql:' <<<"$output" || true)"
  total=$((total + ${planned:-0}))

  if [[ -z "$planned" || "$notok" != "0" || "$passed" != "$planned" || -n "$errors" ]]; then
    failed=1
    echo "FAIL  $rel  (planned ${planned:-?}, passed $passed, failed $notok)"
    grep -E '^not ok|^#|ERROR|psql:' <<<"$output" | sed 's/^/      /'
  else
    echo "ok    $rel  ($passed/$planned)"
  fi
done

echo
if [[ "$failed" == "0" ]]; then
  echo "All $total pgTAP assertions passed."
else
  echo "pgTAP suite FAILED."
  exit 1
fi
