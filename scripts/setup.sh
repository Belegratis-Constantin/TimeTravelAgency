#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPTS_DIR/.." && pwd)"
source "$SCRIPTS_DIR/_common.sh"
source_profiles

echo ""
echo -e "${BOLD}${CYAN}  Time Travel Agency — Setup${RESET}"
divider

# ---------------------------------------------------------------------------
section "Prerequisites"
# ---------------------------------------------------------------------------

step "Checking Homebrew..."
if ! command -v brew &>/dev/null; then
  warn "Homebrew not found — installing now..."
  run_timed "Installing Homebrew" /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null \
    || eval "$(/usr/local/bin/brew shellenv)" 2>/dev/null \
    || true
else
  ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"
fi

step "Checking .NET SDK..."
if ! command -v dotnet &>/dev/null; then
  warn ".NET SDK not found — installing via Homebrew..."
  run_timed "Installing .NET SDK" brew install --cask dotnet-sdk
  export PATH="/usr/local/share/dotnet:$PATH"
else
  ok "dotnet $(dotnet --version)"
fi

step "Checking Node.js..."
if ! command -v node &>/dev/null; then
  warn "Node.js not found — installing via Homebrew..."
  run_timed "Installing Node.js" brew install node
  eval "$(brew shellenv)" 2>/dev/null || true
else
  ok "node $(node --version)"
fi

step "Checking npm..."
command -v npm &>/dev/null \
  || die "npm not found after installing Node.js. Open a new terminal and re-run this script."
ok "npm $(npm --version)"

# ---------------------------------------------------------------------------
section "Backend Dependencies"
# ---------------------------------------------------------------------------

echo ""
run_timed "Restoring NuGet packages" \
  dotnet restore "$REPO_ROOT/TimeTravelAgency.sln"

# ---------------------------------------------------------------------------
section "Frontend Dependencies"
# ---------------------------------------------------------------------------

echo ""
cd "$REPO_ROOT/src/frontend/time-travel-agency-web"
run_timed "Installing npm packages" \
  npm install

# ---------------------------------------------------------------------------
echo ""
divider
echo -e "  ${CHECK} ${GREEN}${BOLD}Setup complete!${RESET}"
echo ""
echo -e "  ${ARROW} Run ${CYAN}./scripts/start.sh${RESET} to launch the project."
echo ""
