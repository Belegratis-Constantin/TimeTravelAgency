#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
source "$SCRIPTS_DIR/_common.sh"
source_profiles

command -v dotnet &>/dev/null || die "dotnet not found. Run ./scripts/setup.sh first."

echo ""
echo -e "${BOLD}${CYAN}  Time Travel Agency — Backend${RESET}"
divider

section "Backend (hot-reload)"
step "Starting dotnet watch..."
info "Project" "TimeTravelAgency.Application"
info "Swagger" "http://localhost:5000/swagger"
divider
echo ""

exec dotnet watch --project "$REPO_ROOT/src/backend/TimeTravelAgency.Application/TimeTravelAgency.Application.csproj"
