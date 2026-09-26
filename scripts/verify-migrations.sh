#!/usr/bin/env bash
# Applies all migrations + seed to a throwaway local Postgres (with pgvector) and runs RLS assertions.
# Requires PostgreSQL 15+ server binaries and the pgvector extension on this machine.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${VERIFY_PG_PORT:-54329}"
WORK="$(mktemp -d)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then chown postgres "$WORK"; RUN_AS=(runuser -u postgres --); fi
cleanup() { "${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

"${RUN_AS[@]}" "$PG_BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" start >/dev/null
PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase_shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ migración $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "→ seed.sql"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
echo "→ seed.sql (segunda vez: idempotencia)"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
echo "→ aserciones RLS"
"${PSQL[@]}" -f "$ROOT/supabase/tests/rls_assertions.sql"
"${PSQL[@]}" -t -c "select 'chunks: ' || count(*) from public.curriculum_chunks"
echo "Migraciones verificadas."
