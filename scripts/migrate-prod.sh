#!/usr/bin/env bash
#
# migrate-prod.sh — apply Supabase migrations to the PRODUCTION database.
#
# Prod is a SEPARATE Supabase account from dev/staging. This script targets it
# directly via a connection string, so no `supabase link` / project switching is
# needed and your local dev link stays untouched.
#
# Usage:
#   PROD_DATABASE_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres" \
#     ./scripts/migrate-prod.sh
#
# Or put PROD_DATABASE_URL in .env.prod.local (gitignored) and run:
#   ./scripts/migrate-prod.sh
#
# Flags:
#   --yes        Skip the interactive confirmation (for non-interactive use).
#   --dry-run    Only show pending migrations; apply nothing.

set -euo pipefail

# --- locate repo root (script lives in scripts/) ---------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# --- load PROD_DATABASE_URL from a dotenv file if not already set ----------
# Prefer .env.prod.local (secret, gitignored); fall back to .env.
for envfile in .env.prod.local .env; do
  if [[ -z "${PROD_DATABASE_URL:-}" && -f "$envfile" ]]; then
    # shellcheck disable=SC1091
    set -a; source "$envfile"; set +a
  fi
done

if [[ -z "${PROD_DATABASE_URL:-}" ]]; then
  echo "ERROR: PROD_DATABASE_URL is not set." >&2
  echo "       Set it in the env or in .env.prod.local (gitignored)." >&2
  exit 1
fi

# --- parse flags -----------------------------------------------------------
ASSUME_YES=false
DRY_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --yes) ASSUME_YES=true ;;
    --dry-run) DRY_ONLY=true ;;
    *) echo "Unknown flag: $arg" >&2; exit 1 ;;
  esac
done

# --- pick the Supabase CLI (prefer the repo's pinned version) --------------
if command -v supabase >/dev/null 2>&1; then
  SUPABASE="supabase"
else
  SUPABASE="pnpm exec supabase"
fi

# --- never print the password; show only the host -------------------------
DB_HOST="$(printf '%s' "$PROD_DATABASE_URL" | sed -E 's#^[^@]*@([^:/]+).*#\1#')"
echo "Target PRODUCTION database host: ${DB_HOST:-unknown}"
echo

# --- transaction-pooler guard ----------------------------------------------
# Migrations need a SESSION connection. The transaction pooler (port 6543 /
# pgbouncer=true) breaks the advisory locks and prepared statements db push uses.
if printf '%s' "$PROD_DATABASE_URL" | grep -qE ':6543|pgbouncer=true'; then
  echo "ERROR: PROD_DATABASE_URL points at the transaction pooler (port 6543 / pgbouncer=true)." >&2
  echo "       Migrations require a SESSION connection. Use port 5432 (session pooler)" >&2
  echo "       or the direct connection string, then re-run." >&2
  exit 1
fi

echo "==> Pending migrations (dry run):"
$SUPABASE db push --db-url "$PROD_DATABASE_URL" --dry-run

if [[ "$DRY_ONLY" == true ]]; then
  echo
  echo "Dry run only. Nothing applied."
  exit 0
fi

# --- confirm before touching prod ------------------------------------------
if [[ "$ASSUME_YES" != true ]]; then
  echo
  read -r -p "Apply the above migrations to PRODUCTION? Type 'yes' to proceed: " reply
  if [[ "$reply" != "yes" ]]; then
    echo "Aborted. Nothing applied."
    exit 1
  fi
fi

echo
echo "==> Applying migrations to PRODUCTION..."
$SUPABASE db push --db-url "$PROD_DATABASE_URL"

echo
echo "Done. Production schema is up to date."
