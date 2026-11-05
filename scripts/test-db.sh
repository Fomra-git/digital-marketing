#!/usr/bin/env bash
# Runs every migration and every RLS test against a throw-away local Postgres.
#
#   ./scripts/test-db.sh
#
# Needs PostgreSQL 15+ binaries on PATH (or PG_BIN=/usr/lib/postgresql/16/bin).
# The Supabase-provided objects (auth, storage, API roles) are stubbed by
# supabase/tests/_supabase_stubs.sql. Against a real Supabase project, run the
# migrations with `supabase db push` instead.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || echo /usr/lib/postgresql/16/bin/initdb)")}"
PORT="${PGTEST_PORT:-54329}"
WORK="$(mktemp -d)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # postgres refuses to run as root
  RUN_AS=(runuser -u postgres --)
  chown postgres "$WORK"
fi

cleanup() {
  "${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"${RUN_AS[@]}" "$PG_BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" start >/dev/null

PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)

echo "• stubs"
"${PSQL[@]}" -f "$ROOT/supabase/tests/_supabase_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "• migration $(basename "$f")"
  "${PSQL[@]}" -f "$f" >/dev/null
done
for f in "$ROOT"/supabase/tests/*.test.sql; do
  echo "• test $(basename "$f")"
  "${PSQL[@]}" -f "$f" >/dev/null
done
echo "All migrations and database tests passed."
