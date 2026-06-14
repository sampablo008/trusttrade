#!/usr/bin/env bash
#
# migrate-dev.sh — apply Supabase migrations to the DEV/STAGING database.
#
# Dev's connection string (DATABASE_URL) normally points at the TRANSACTION
# pooler (port 6543 / pgbouncer=true) for app runtime. Migrations need a SESSION
# connection, so this script auto-rewrites the URL to the session pooler
# (port 5432, no pgbouncer) before pushing. Prod uses the stricter
# migrate-prod.sh (which refuses a pooler URL outright).
#
# Usage:
#   ./scripts/migrate-dev.sh            # apply pending migrations
#   ./scripts/migrate-dev.sh --dry-run  # show pending, apply nothing
#
# Reads DATABASE_URL from the env, or from .env (gitignored) if unset.

set -euo pipefail

# --- locate repo root (script lives in scripts/) ---------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# --- load DATABASE_URL from .env if not already set ------------------------
if [[ -z "${DATABASE_URL:-}" && -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set (checked env and .env)." >&2
  exit 1
fi

# --- parse flags -----------------------------------------------------------
DRY_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_ONLY=true ;;
    *) echo "Unknown flag: $arg" >&2; exit 1 ;;
  esac
done

# --- rewrite transaction pooler -> session pooler --------------------------
# Migrations break over the transaction pooler (advisory locks / prepared
# statements). Move 6543 -> 5432 and drop the pgbouncer flag.
SESSION_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#:6543/#:5432/#; s#[?&]pgbouncer=true##')"

# --- pick the Supabase CLI (prefer a global, else the repo's pinned one) ---
if command -v supabase >/dev/null 2>&1; then
  SUPABASE="supabase"
else
  SUPABASE="pnpm exec supabase"
fi

# --- never print the password; show only the host -------------------------
DB_HOST="$(printf '%s' "$SESSION_URL" | sed -E 's#^[^@]*@([^/?]+).*#\1#')"
echo "Target DEV database: ${DB_HOST:-unknown}"
echo

echo "==> Pending migrations (dry run):"
$SUPABASE db push --db-url "$SESSION_URL" --dry-run

if [[ "$DRY_ONLY" == true ]]; then
  echo
  echo "Dry run only. Nothing applied."
  exit 0
fi

echo
echo "==> Applying migrations to DEV..."
$SUPABASE db push --db-url "$SESSION_URL"

echo
echo "Done. Dev schema is up to date."
