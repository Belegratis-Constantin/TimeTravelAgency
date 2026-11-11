#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
source "$SCRIPTS_DIR/_common.sh"
source_profiles

RUN_BACKEND=true
RUN_FRONTEND=true

for arg in "$@"; do
  case "$arg" in
    --backend)  RUN_FRONTEND=false ;;
    --frontend) RUN_BACKEND=false ;;
  esac
done

FAILED=0

echo ""
echo -e "${BOLD}${CYAN}  Time Travel Agency — Tests${RESET}"
divider

if $RUN_BACKEND; then
  section "Backend Tests (.NET / xUnit)"
  echo ""
  run_timed "Running dotnet test" \
    dotnet test "$REPO_ROOT/TimeTravelAgency.sln" || FAILED=1
fi

if $RUN_FRONTEND; then
  section "Frontend Tests (Karma / ChromeHeadless)"
  echo ""
  cd "$REPO_ROOT/src/frontend/time-travel-agency-web"
  run_timed "Running frontend tests" \
    env NG_CLI_ANALYTICS=false npm test -- --watch=false --browsers=ChromeHeadless || FAILED=1
fi

echo ""
divider
if [ "$FAILED" -eq 1 ]; then
  echo -e "  ${CROSS} ${RED}${BOLD}One or more test suites failed.${RESET}"
  echo ""
  exit 1
fi
echo -e "  ${CHECK} ${GREEN}${BOLD}All tests passed.${RESET}"
echo ""
