#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
source "$SCRIPTS_DIR/_common.sh"
source_profiles

cleanup() {
  echo ""
  echo -e "  ${ARROW} Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo -e "  ${CHECK} All processes stopped."
  echo ""
}
trap cleanup INT TERM

# Guard
command -v dotnet &>/dev/null || die "dotnet not found. Run ./scripts/setup.sh first."
command -v npm    &>/dev/null || die "npm not found. Run ./scripts/setup.sh first."

echo ""
echo -e "${BOLD}${CYAN}  Time Travel Agency — Start${RESET}"
divider

section "Backend"
step "Launching API (dotnet run)..."
! kill $(lsof -ti :5000)
dotnet run --project "$REPO_ROOT/src/backend/TimeTravelAgency.Application/TimeTravelAgency.Application.csproj" \
  2>&1 | while IFS= read -r line; do
    echo -e "  ${DIM}[backend]${RESET}  $line"
  done &
BACKEND_PID=$!
ok "Backend process started  ${DIM}(pid $BACKEND_PID)${RESET}"

section "Frontend"
step "Launching Angular dev server (npm start)..."
cd "$REPO_ROOT/src/frontend/time-travel-agency-web"
NG_CLI_ANALYTICS=false npm start 2>&1 | while IFS= read -r line; do
    echo -e "  ${DIM}[frontend]${RESET} $line"
  done &
FRONTEND_PID=$!
ok "Frontend process started  ${DIM}(pid $FRONTEND_PID)${RESET}"

echo ""
divider
echo -e "  ${ARROW} ${BOLD}Backend${RESET}   ${CYAN}http://localhost:5000/swagger${RESET}"
echo -e "  ${ARROW} ${BOLD}Frontend${RESET}  ${CYAN}http://localhost:4200${RESET}"
divider
echo -e "  ${DIM}Press Ctrl+C to stop both services.${RESET}"
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
