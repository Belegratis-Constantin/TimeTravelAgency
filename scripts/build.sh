#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
source "$SCRIPTS_DIR/_common.sh"
source_profiles

command -v dotnet &>/dev/null || die "dotnet not found. Run ./scripts/setup.sh first."
command -v npm    &>/dev/null || die "npm not found. Run ./scripts/setup.sh first."

echo ""
echo -e "${BOLD}${CYAN}  Time Travel Agency — Build${RESET}"
divider

section "Backend (Release)"
echo ""
run_timed "Building .NET solution" \
  dotnet build "$REPO_ROOT/TimeTravelAgency.sln" --configuration Release

section "Frontend (Production)"
echo ""
cd "$REPO_ROOT/src/frontend/time-travel-agency-web"
run_timed "Building Angular app" \
  env NG_CLI_ANALYTICS=false npm run build

echo ""
divider
echo -e "  ${CHECK} ${GREEN}${BOLD}Build complete.${RESET}"
echo ""
