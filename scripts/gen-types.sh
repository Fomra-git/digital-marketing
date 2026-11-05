#!/usr/bin/env bash
# Regenerates src/types/database.types.ts.
#   Against a Supabase project:  SUPABASE_PROJECT_ID=xxxx ./scripts/gen-types.sh
#   Against a local Postgres that has the migrations applied:
#                                DB_URL=postgresql://... ./scripts/gen-types.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/src/types/database.types.ts"
if [ -n "${SUPABASE_PROJECT_ID:-}" ]; then
  npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > "$OUT"
elif [ -n "${DB_URL:-}" ]; then
  npx supabase gen types typescript --db-url "$DB_URL" --schema public > "$OUT"
else
  npx supabase gen types typescript --local --schema public > "$OUT"
fi
npx prettier --write "$OUT" >/dev/null
echo "Wrote $OUT"
