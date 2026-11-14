#!/usr/bin/env bash
# ================================================================================
DESC="Static heuristic security scan of a vendored extension, plus a marketplace provenance check"
# ================================================================================

HELP="\
${DESC}

Usage: ./security_check_heuristics.sh <extension_dir>

Args:
  <extension_dir>   Path to a vendored extension folder (contains src/, SOURCE.json)
  -h, --help        Show this help

Scans <extension_dir>/src for risky patterns (eval, dynamic Function, child_process,
network calls, postinstall scripts, unusually long/minified lines) and, if a built
.vsix and a recorded marketplace vsixUrl are both present, downloads the published
vsix and diffs its bundled entry file against the one built from this vendored
source -- a mismatch means the published binary contains code not visible in the
public repo.

Writes findings to <extension_dir>/REVIEW.heuristics.md.
Exits 1 on a hard-fail pattern or a provenance mismatch; soft findings exit 0 --
read the review file yourself either way.

Examples:
  ./security_check_heuristics.sh ../YangYangLeeLee.claude-code-context-add"

set -uo pipefail  # deliberately not -e: we want every check to run and be recorded

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  "") die "missing <extension_dir> argument" ;;
esac

EXT_DIR="$(cd "$1" 2>/dev/null && pwd)" || die "no such directory: $1"
SRC_DIR="$EXT_DIR/src"
[ -d "$SRC_DIR" ] || die "no src/ found under $EXT_DIR"

REVIEW="$EXT_DIR/REVIEW.heuristics.md"
HARD_FAIL=0

{
  echo "# Heuristic security check"
  echo
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Pattern scan"
  echo
} > "$REVIEW"

HARD_PATTERNS=(
  'eval\('
  'new Function\('
  'child_process'
  '\bexec(Sync)?\('
  '\bspawn(Sync)?\('
)
SOFT_PATTERNS=(
  'fetch\('
  'https?\.request\('
  'XMLHttpRequest'
  'process\.env'
)

scan_patterns() {
  local -n patterns_ref=$1
  local label="$2"
  local hits=0
  local file pattern

  while IFS= read -r -d '' file; do
    for pattern in "${patterns_ref[@]}"; do
      if grep -nE "$pattern" "$file" >/dev/null 2>&1; then
        hits=1
        {
          echo "- **$label**: \`$pattern\` in \`${file#"$SRC_DIR"/}\`"
          grep -nE "$pattern" "$file" | sed 's/^/    /'
        } >> "$REVIEW"
      fi
    done
  done < <(find "$SRC_DIR" -type f \( -name '*.js' -o -name '*.ts' \) -not -path '*/node_modules/*' -print0)

  return $hits
}

if ! scan_patterns HARD_PATTERNS "HARD FAIL"; then
  HARD_FAIL=1
fi
scan_patterns SOFT_PATTERNS "review" || true

if [ -f "$SRC_DIR/package.json" ] && command -v jq >/dev/null 2>&1 \
   && jq -e '.scripts.postinstall // .scripts.preinstall' "$SRC_DIR/package.json" >/dev/null 2>&1; then
  echo "- **HARD FAIL**: package.json declares a postinstall/preinstall script" >> "$REVIEW"
  HARD_FAIL=1
fi

while IFS= read -r -d '' file; do
  if awk 'length > 500 { found=1 } END { exit !found }' "$file"; then
    echo "- **review**: unusually long line(s) in \`${file#"$SRC_DIR"/}\` (possible minified/obfuscated code committed as source)" >> "$REVIEW"
  fi
done < <(find "$SRC_DIR" -type f \( -name '*.js' -o -name '*.ts' \) -not -path '*/node_modules/*' -not -path '*/dist/*' -print0)

{
  echo
  echo "## Marketplace vsix provenance check"
  echo
} >> "$REVIEW"

SOURCE_JSON="$EXT_DIR/SOURCE.json"
VSIX_URL=""
[ -f "$SOURCE_JSON" ] && command -v jq >/dev/null 2>&1 && VSIX_URL="$(jq -r '.vsixUrl // empty' "$SOURCE_JSON")"
BUILT_VSIX="$(find "$EXT_DIR/build" -maxdepth 1 -name '*.vsix' 2>/dev/null | sort | tail -1)"

if [ -z "$VSIX_URL" ] || [ -z "$BUILT_VSIX" ]; then
  echo "Skipped: no marketplace vsixUrl and/or no locally built .vsix to compare." >> "$REVIEW"
else
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' RETURN EXIT
  if curl -sfL "$VSIX_URL" -o "$TMP/marketplace.vsix"; then
    mkdir -p "$TMP/marketplace" "$TMP/built"
    unzip -qq "$TMP/marketplace.vsix" -d "$TMP/marketplace" || true
    unzip -qq "$BUILT_VSIX" -d "$TMP/built" || true
    MAIN_REL="main"
    [ -f "$SRC_DIR/package.json" ] && MAIN_REL="$(jq -r '.main // "./extension.js"' "$SRC_DIR/package.json" | sed 's#^\./##')"
    MP_MAIN="$TMP/marketplace/extension/$MAIN_REL"
    BUILT_MAIN="$TMP/built/extension/$MAIN_REL"
    if [ -f "$MP_MAIN" ] && [ -f "$BUILT_MAIN" ]; then
      if diff -q "$MP_MAIN" "$BUILT_MAIN" >/dev/null 2>&1; then
        echo "MATCH: published vsix bundle is byte-identical to the one built from vendored source." >> "$REVIEW"
      else
        {
          echo "**HARD FAIL**: published vsix bundle differs from the one built from vendored source."
          echo '```diff'
        } >> "$REVIEW"
        diff -u "$BUILT_MAIN" "$MP_MAIN" >> "$REVIEW" 2>&1 || true
        echo '```' >> "$REVIEW"
        HARD_FAIL=1
      fi
    else
      echo "Skipped: could not locate the bundled entry file ($MAIN_REL) in one or both vsix packages." >> "$REVIEW"
    fi
  else
    echo "Skipped: failed to download the published vsix from the marketplace." >> "$REVIEW"
  fi
fi

echo >> "$REVIEW"
if [ "$HARD_FAIL" -eq 1 ]; then
  echo "**Result: HARD FAIL -- do not install without manual review.**" >> "$REVIEW"
  exit 1
else
  echo "Result: no hard-fail patterns found. Review any soft findings above before trusting this extension." >> "$REVIEW"
  exit 0
fi
