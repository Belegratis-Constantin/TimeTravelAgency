#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
source "$SCRIPTS_DIR/_common.sh"

DB="$REPO_ROOT/src/backend/TimeTravelAgency.Application/TimeTravelAgencyTest.db"

echo ""
echo -e "${BOLD}${CYAN}  Time Travel Agency — Reset Database${RESET}"
divider

section "SQLite Database"
info "File" "$DB"

if [ -f "$DB" ]; then
  step "Deleting database file..."
  rm "$DB"
  ok "Database deleted"
  echo ""
  echo -e "  ${ARROW} Restart the API to recreate and reseed the database."
else
  warn "No database file found — nothing to delete."
fi

echo ""
