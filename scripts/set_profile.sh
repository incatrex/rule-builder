#!/usr/bin/env bash
# ================================================================================
DESC="Apply a VS Code settings profile for the current context"
# ================================================================================

HELP="\
${DESC}

Usage: ./scripts/set_profile.sh [--local|--remote|--devcontainer]

Args:
  --local           Apply the local profile
  --remote          Apply the remote (SSH) profile
  --devcontainer    Apply the devcontainer profile
  -h, --help        Show this help

With no argument, auto-detects the context from SSH/devcontainer env vars.

Inputs:  .vscode/settings.<profile>.json
Outputs: .vscode/settings.json

Examples:
  ./scripts/set_profile.sh
  ./scripts/set_profile.sh --devcontainer"

set -euo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  --local) PROFILE="local" ;;
  --remote) PROFILE="remote" ;;
  --devcontainer) PROFILE="devcontainer" ;;
  "")
    if [ -n "${SERVER_INSTALL_DEVCONTAINER:-}" ] || [ -n "${REMOTE_CONTAINERS:-}" ]; then
      PROFILE="devcontainer"
    elif [ -n "${SSH_CONNECTION:-}" ] || [ -n "${SSH_CLIENT:-}" ] || [ -n "${SSH_TTY:-}" ]; then
      PROFILE="remote"
    else
      PROFILE="local"
    fi
    ;;
  *) die "unknown argument: $1" ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

SRC="$REPO_ROOT/.vscode/settings.$PROFILE.json"
DEST="$REPO_ROOT/.vscode/settings.json"

if [ ! -f "$SRC" ]; then
  echo "No profile file found at $SRC" >&2
  exit 1
fi

cp "$SRC" "$DEST"
echo "Applied VS Code settings profile: $PROFILE ($DEST)"
