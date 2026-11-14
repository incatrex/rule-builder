#!/usr/bin/env bash
# ================================================================================
DESC="Install a built .vsix file into the current VS Code / devcontainer environment"
# ================================================================================

HELP="\
${DESC}

Usage: ./install_vsix.sh <path-to-vsix>

Args:
  <path-to-vsix>   Path to a .vsix file to install
  -h, --help       Show this help

Examples:
  ./install_vsix.sh ../YangYangLeeLee.claude-code-context-add/build/claude-code-context-add-1.0.0.vsix"

set -euo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  "") die "missing <path-to-vsix> argument" ;;
esac

VSIX="$1"
[ -f "$VSIX" ] || die "file not found: $VSIX"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./find_code_bin.sh
source "$SCRIPT_DIR/find_code_bin.sh"

CODE_BIN="$(find_code_bin)"
[ -n "$CODE_BIN" ] || die "'code' CLI not found (no remote-cli binary or code/code-insiders on PATH)"
ensure_vscode_ipc_hook "$CODE_BIN" || die "no responsive VS Code IPC socket found (run from a VS Code terminal)"

run_code "$CODE_BIN" --install-extension "$VSIX"
