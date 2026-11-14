#!/usr/bin/env bash
# ================================================================================
DESC="Build a .vsix package from a vendored extension's source"
# ================================================================================

HELP="\
${DESC}

Usage: ./build_vsix.sh <src_dir> <out_dir>

Args:
  <src_dir>   Path to the vendored extension's source (contains package.json)
  <out_dir>   Directory to place the resulting .vsix in
  -h, --help  Show this help

Runs the extension's own \"package\" npm script if it has one, otherwise falls
back to \`vsce package\` directly. Prints the path to the built .vsix on stdout.

Examples:
  ./build_vsix.sh ../YangYangLeeLee.claude-code-context-add/src ../YangYangLeeLee.claude-code-context-add/build"

set -euo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac

SRC_DIR="${1:-}"
OUT_DIR="${2:-}"
[ -n "$SRC_DIR" ] && [ -n "$OUT_DIR" ] || die "usage: build_vsix.sh <src_dir> <out_dir>"
SRC_DIR="$(cd "$SRC_DIR" 2>/dev/null && pwd)" || die "no such directory: $1"
[ -f "$SRC_DIR/package.json" ] || die "no package.json found in $SRC_DIR"

command -v npm >/dev/null 2>&1 || die "npm is required"
command -v jq >/dev/null 2>&1 || die "jq is required"

mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"

BEFORE="$(find "$SRC_DIR" -maxdepth 1 -name '*.vsix' 2>/dev/null | sort)"

(
  cd "$SRC_DIR"
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi

  if jq -e '.scripts.package' package.json >/dev/null 2>&1; then
    npm run package
  else
    npx --yes @vscode/vsce package --no-dependencies
  fi
)

AFTER="$(find "$SRC_DIR" -maxdepth 1 -name '*.vsix' 2>/dev/null | sort)"
NEW_VSIX="$(comm -13 <(echo "$BEFORE") <(echo "$AFTER") | head -1)"
[ -n "$NEW_VSIX" ] || NEW_VSIX="$(echo "$AFTER" | tail -1)"
[ -n "$NEW_VSIX" ] || die "build did not produce a .vsix in $SRC_DIR"

DEST="$OUT_DIR/$(basename "$NEW_VSIX")"
mv "$NEW_VSIX" "$DEST"

SHA="$(sha256sum "$DEST" | awk '{print $1}')"
echo "Built $DEST (sha256: $SHA)" >&2
echo "$DEST"
