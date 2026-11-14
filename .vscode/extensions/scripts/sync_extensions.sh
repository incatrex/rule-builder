#!/usr/bin/env bash
# ================================================================================
DESC="Install any vendored VS Code extensions missing from this environment"
# ================================================================================

HELP="\
${DESC}

Usage: ./sync_extensions.sh [<publisher>.<name>]

Args:
  <publisher>.<name>   Sync only this vendored extension
  -h, --help           Show this help

With no argument, syncs every vendored extension found under this folder.
Extensions already installed are left alone. A vendored extension with no
built .vsix yet (not added via add_extension.sh) is skipped with a warning
rather than failing the whole run.

Inputs:  ../<publisher>.<name>/build/*.vsix
Outputs: installs missing extensions via \`code --install-extension\`

Examples:
  ./sync_extensions.sh
  ./sync_extensions.sh YangYangLeeLee.claude-code-context-add"

set -uo pipefail  # deliberately not -e: one extension failing shouldn't stop the rest

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSIONS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ONLY="${1:-}"

# shellcheck source=./lib/find_code_bin.sh
source "$SCRIPT_DIR/lib/find_code_bin.sh"

CODE_BIN="$(find_code_bin)"
if [ -z "$CODE_BIN" ]; then
  echo "Warning: 'code' CLI not found; skipping extension sync." >&2
  exit 0
fi
if ! ensure_vscode_ipc_hook "$CODE_BIN"; then
  echo "Warning: no responsive VS Code IPC socket found; skipping extension sync." >&2
  echo "         Re-run from a VS Code terminal: .vscode/extensions/scripts/sync_extensions.sh" >&2
  exit 0
fi

if ! INSTALLED="$(run_code "$CODE_BIN" --list-extensions 2>/dev/null)"; then
  echo "Warning: 'code --list-extensions' failed or timed out; skipping extension sync." >&2
  exit 0
fi
INSTALLED="$(tr '[:upper:]' '[:lower:]' <<< "$INSTALLED")"

is_installed() {
  grep -qxF "$(tr '[:upper:]' '[:lower:]' <<< "$1")" <<< "$INSTALLED"
}

sync_one() {
  local ext_id="$1"
  local dir="$EXTENSIONS_DIR/$ext_id"
  local vsix

  if [ ! -d "$dir" ]; then
    die "no vendored extension found at $dir"
  fi

  if is_installed "$ext_id"; then
    echo "OK: $ext_id already installed."
    return 0
  fi

  vsix="$(find "$dir/build" -maxdepth 1 -name '*.vsix' 2>/dev/null | sort | tail -1)"
  if [ -z "$vsix" ]; then
    echo "Warning: no built .vsix for $ext_id yet (run add_extension.sh or update_extension.sh first)." >&2
    return 0
  fi

  echo "Installing $ext_id from $vsix ..."
  "$SCRIPT_DIR/lib/install_vsix.sh" "$vsix" || echo "Warning: failed to install $ext_id" >&2
}

if [ -n "$ONLY" ]; then
  sync_one "$ONLY"
  exit 0
fi

found_any=0
while IFS= read -r dir; do
  found_any=1
  sync_one "$(basename "$dir")"
done < <(find "$EXTENSIONS_DIR" -mindepth 1 -maxdepth 1 -type d ! -name 'scripts')

if [ "$found_any" -eq 0 ]; then
  echo "No vendored extensions found under $EXTENSIONS_DIR."
fi
