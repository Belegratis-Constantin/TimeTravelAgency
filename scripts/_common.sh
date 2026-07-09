#!/usr/bin/env bash
# Shared formatting helpers — source this file, do not run it directly.

# Colors (disabled automatically if not a terminal)
if [ -t 1 ]; then
  BOLD='\033[1m'
  DIM='\033[2m'
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  WHITE='\033[0;37m'
  RESET='\033[0m'
else
  BOLD=''; DIM=''; RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; WHITE=''; RESET=''
fi

# Symbols
CHECK="${GREEN}✔${RESET}"
CROSS="${RED}✘${RESET}"
ARROW="${CYAN}›${RESET}"
WARN="${YELLOW}⚠${RESET}"

# Print a section header
section() {
  echo ""
  echo -e "${BOLD}${BLUE}╔══════════════════════════════════════╗${RESET}"
  printf "${BOLD}${BLUE}║${RESET}  %-36s${BOLD}${BLUE}║${RESET}\n" "$1"
  echo -e "${BOLD}${BLUE}╚══════════════════════════════════════╝${RESET}"
}

# Print a step (indented, with arrow)
step() {
  echo -e "  ${ARROW} $1"
}

# Print success
ok() {
  echo -e "  ${CHECK} $1"
}

# Print a warning
warn() {
  echo -e "  ${WARN}  ${YELLOW}$1${RESET}"
}

# Print an error and exit
die() {
  echo ""
  echo -e "  ${CROSS} ${RED}${BOLD}Error:${RESET} ${RED}$1${RESET}"
  echo ""
  exit 1
}

# Print a key/value info line
info() {
  printf "  ${DIM}%-14s${RESET} %s\n" "$1" "$2"
}

# Print a divider
divider() {
  echo -e "  ${DIM}──────────────────────────────────────${RESET}"
}

# Run a command with a live elapsed-time ticker.
# Usage: run_timed "Label" command [args...]
run_timed() {
  local label="$1"; shift

  # Ticker runs in the background, printing elapsed time on the same line.
  _ticker() {
    local start=$SECONDS
    while true; do
      local elapsed=$(( SECONDS - start ))
      local mins=$(( elapsed / 60 ))
      local secs=$(( elapsed % 60 ))
      printf "\r  ${ARROW} ${label}  ${DIM}%02d:%02d${RESET}  " "$mins" "$secs"
      sleep 1
    done
  }

  _ticker &
  local ticker_pid=$!

  # Run the actual command, capturing its exit code without aborting the ticker.
  set +e
  "$@"
  local exit_code=$?
  set -e

  kill "$ticker_pid" 2>/dev/null
  wait "$ticker_pid" 2>/dev/null || true

  local elapsed=$(( SECONDS ))
  local mins=$(( elapsed / 60 ))
  local secs=$(( elapsed % 60 ))

  # Clear the ticker line before printing the result.
  printf "\r\033[2K"

  if [ "$exit_code" -eq 0 ]; then
    echo -e "  ${CHECK} ${label}  ${DIM}(${mins}m ${secs}s)${RESET}"
  else
    echo -e "  ${CROSS} ${RED}${label} failed${RESET}  ${DIM}(${mins}m ${secs}s)${RESET}"
  fi

  return "$exit_code"
}

# Source login profiles so PATH (dotnet, node, etc.) is fully populated
source_profiles() {
  [ -f "$HOME/.zprofile" ]     && source "$HOME/.zprofile"
  [ -f "$HOME/.zshrc" ]        && source "$HOME/.zshrc"
  [ -f "$HOME/.bash_profile" ] && source "$HOME/.bash_profile"

  for dir in "/usr/local/share/dotnet" "$HOME/.dotnet" "/usr/local/bin" "/opt/homebrew/bin"; do
    [ -x "$dir/dotnet" ] && export PATH="$dir:$PATH" && break
  done
}
