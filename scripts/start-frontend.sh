#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
source "$SCRIPTS_DIR/_common.sh"
source_profiles

command -v npm &>/dev/null || die "npm not found. Run ./scripts/setup.sh first."

echo ""
echo -e "${BOLD}${CYAN}  Time Travel Agency — Frontend${RESET}"
divider

section "Angular Dev Server"
step "Starting ng serve..."
info "URL" "http://localhost:4200"
divider
echo ""

cd "$REPO_ROOT/src/frontend/time-travel-agency-web"
exec env NG_CLI_ANALYTICS=false npm start
