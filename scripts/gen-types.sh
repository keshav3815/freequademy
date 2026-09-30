#!/usr/bin/env bash
# Regenerates src/integrations/supabase/types.ts from a LOCAL database that has
# every migration applied (e.g. `KEEP_DB=1 scripts/test-db.sh`, or `supabase start`).
#   DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres scripts/gen-types.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${DB_URL:?Set DB_URL to a local database URL}"
case "$DB_URL" in
  *127.0.0.1*|*localhost*) ;;
  *) echo "Refusing to generate types from a non-local database: $DB_URL" >&2; exit 1 ;;
esac
tmp="$(mktemp)"
npx supabase gen types typescript --db-url "$DB_URL" --schema public > "$tmp"
python3 - "$tmp" "$ROOT/src/integrations/supabase/types.ts" <<'PY'
import sys
src, dst = sys.argv[1], sys.argv[2]
g = open(src).read()
header = '''export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
'''
g = g.replace('export type Database = {\n', header, 1)
open(dst, 'w').write(g)
PY
rm -f "$tmp"
rm -rf "$ROOT/supabase/.temp"
echo "types.ts regenerated"
