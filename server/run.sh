#!/usr/bin/env bash
#
# run.sh – Start the Django development server, waiting for PostgreSQL first.
#
# Usage:
#   ./run.sh              # wait for DB, migrate, then runserver
#   ./run.sh --nomigrate  # skip migrations, just wait for DB + runserver
#   ./run.sh --nowait     # skip the DB readiness check entirely
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

WAIT=true
MIGRATE=true
EXTRA_ARGS=()

for arg in "$@"; do
    case "$arg" in
        --nowait)    WAIT=false ;;
        --nomigrate) MIGRATE=false ;;
        *)           EXTRA_ARGS+=("$arg") ;;
    esac
done

# ── 1. Wait for the database ─────────────────────────────────────────
if [ "$WAIT" = true ]; then
    echo "⏳ Waiting for PostgreSQL to become available…"
    python manage.py wait_for_db
fi

# ── 2. Apply pending migrations ──────────────────────────────────────
if [ "$MIGRATE" = true ]; then
    echo "📦 Applying database migrations…"
    python manage.py migrate --noinput
fi

# ── 3. Start the development server ──────────────────────────────────
echo "🚀 Starting Django development server…"
exec python manage.py runserver "${EXTRA_ARGS[@]}"
