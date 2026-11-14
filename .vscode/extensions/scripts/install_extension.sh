#!/usr/bin/env bash
# ================================================================================
DESC="Install (or reinstall) a vendored extension's currently-built .vsix"
# ================================================================================

HELP="\
${DESC}

Usage: ./install_extension.sh <publisher>.<name>

Args:
  <publisher>.<name>   Vendored extension to install
  -h, --help           Show this help

Always installs the current build/*.vsix for this extension, whether or not it's
already installed -- use this after add_extension.sh or update_extension.sh to
actually apply what was built. (sync_extensions.sh, by contrast, only fills in
extensions that are completely missing; it won't reapply an in-place update.)

Examples:
  ./install_extension.sh YangYangLeeLee.claude-code-context-add"

set -euo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  "") die "missing <publisher>.<name> argument" ;;
esac

EXT_ID="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSIONS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EXT_DIR="$EXTENSIONS_DIR/$EXT_ID"

[ -d "$EXT_DIR" ] || die "no vendored extension found at $EXT_DIR"

VSIX="$(find "$EXT_DIR/build" -maxdepth 1 -name '*.vsix' 2>/dev/null | sort | tail -1)"
[ -n "$VSIX" ] || die "no built .vsix found under $EXT_DIR/build (run add_extension.sh or update_extension.sh first)"

"$SCRIPT_DIR/lib/install_vsix.sh" "$VSIX"
