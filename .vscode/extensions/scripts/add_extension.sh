#!/usr/bin/env bash
# ================================================================================
DESC="Vendor a new VS Code extension: fetch its source, build it, and run security checks"
# ================================================================================

HELP="\
${DESC}

Usage: ./add_extension.sh <publisher>.<name> [--ref <branch|tag|commit>] [--skip-heuristics] [--skip-claude-review]

Args:
  <publisher>.<name>     Marketplace extension ID to vendor
  --ref <ref>            Git ref to check out instead of the source repo's default branch
  --skip-heuristics      Don't run the heuristic pattern scan
  --skip-claude-review   Don't run the Claude-driven review
  -h, --help             Show this help

Never installs the extension -- that stays a separate, deliberate step via
sync_extensions.sh or lib/install_vsix.sh once you've read the review output.

Examples:
  ./add_extension.sh YangYangLeeLee.claude-code-context-add
  ./add_extension.sh YangYangLeeLee.claude-code-context-add --ref v1.2.0 --skip-claude-review"

set -euo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

EXT_ID=""
REF=""
SKIP_HEURISTICS=0
SKIP_CLAUDE=0

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --ref) REF="${2:-}"; [ -n "$REF" ] || die "--ref needs a value"; shift 2 ;;
    --skip-heuristics) SKIP_HEURISTICS=1; shift ;;
    --skip-claude-review) SKIP_CLAUDE=1; shift ;;
    -*) die "unknown option: $1" ;;
    *)
      [ -z "$EXT_ID" ] || die "unexpected extra argument: $1"
      EXT_ID="$1"; shift ;;
  esac
done
[ -n "$EXT_ID" ] || die "missing <publisher>.<name> argument"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSIONS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EXT_DIR="$EXTENSIONS_DIR/$EXT_ID"
LOCK_FILE="$EXTENSIONS_DIR/extensions.lock.json"

[ -d "$EXT_DIR" ] && die "$EXT_ID is already vendored at $EXT_DIR (use update_extension.sh instead)"

command -v git >/dev/null 2>&1 || die "git is required"
command -v jq >/dev/null 2>&1 || die "jq is required"
command -v rsync >/dev/null 2>&1 || die "rsync is required"

echo "==> Resolving $EXT_ID on the marketplace"
RESOLVED="$("$SCRIPT_DIR/lib/resolve_source.sh" "$EXT_ID")"
VERSION="$(echo "$RESOLVED" | jq -r '.version')"
SOURCE_REPO="$(echo "$RESOLVED" | jq -r '.sourceRepo')"
VSIX_URL="$(echo "$RESOLVED" | jq -r '.vsixUrl')"
echo "    version: $VERSION"
echo "    source:  $SOURCE_REPO"

TMP_CLONE="$(mktemp -d)"
trap 'rm -rf "$TMP_CLONE"' EXIT

echo "==> Cloning source"
git clone --quiet "$SOURCE_REPO" "$TMP_CLONE"
if [ -n "$REF" ]; then
  git -C "$TMP_CLONE" checkout --quiet "$REF"
fi
COMMIT="$(git -C "$TMP_CLONE" rev-parse HEAD)"
echo "    commit: $COMMIT"

mkdir -p "$EXT_DIR"
rsync -a --exclude='.git' "$TMP_CLONE"/ "$EXT_DIR/src/"

DATE="$(date -u +%Y-%m-%d)"
jq -n \
  --arg extensionId "$EXT_ID" \
  --arg sourceRepo "$SOURCE_REPO" \
  --arg commit "$COMMIT" \
  --arg version "$VERSION" \
  --arg vsixUrl "$VSIX_URL" \
  --arg date "$DATE" \
  '{
    extensionId: $extensionId,
    sourceRepo: $sourceRepo,
    commit: $commit,
    version: $version,
    vsixUrl: $vsixUrl,
    dateAdded: $date,
    dateUpdated: $date,
    review: {
      heuristics: { status: "not_run", date: null },
      claude:     { status: "not_run", date: null }
    }
  }' > "$EXT_DIR/SOURCE.json"

echo "==> Building .vsix"
"$SCRIPT_DIR/lib/build_vsix.sh" "$EXT_DIR/src" "$EXT_DIR/build"

HEURISTICS_STATUS="skipped"
if [ "$SKIP_HEURISTICS" -eq 0 ]; then
  echo "==> Running heuristic security check"
  if "$SCRIPT_DIR/lib/security_check_heuristics.sh" "$EXT_DIR"; then
    HEURISTICS_STATUS="pass"
  else
    HEURISTICS_STATUS="flagged"
    echo "    !! heuristic check flagged hard-fail issues -- see $EXT_DIR/REVIEW.heuristics.md" >&2
  fi
fi

CLAUDE_STATUS="skipped"
if [ "$SKIP_CLAUDE" -eq 0 ]; then
  echo "==> Running Claude-driven review"
  if "$SCRIPT_DIR/lib/security_check_claude.sh" "$EXT_DIR"; then
    CLAUDE_STATUS="reviewed"
  else
    CLAUDE_STATUS="skipped_no_tool"
  fi
fi

jq \
  --arg hStatus "$HEURISTICS_STATUS" \
  --arg cStatus "$CLAUDE_STATUS" \
  --arg date "$DATE" \
  '.review.heuristics = { status: $hStatus, date: (if $hStatus == "skipped" then null else $date end) }
   | .review.claude     = { status: $cStatus, date: (if $cStatus == "reviewed" then $date else null end) }' \
  "$EXT_DIR/SOURCE.json" > "$EXT_DIR/SOURCE.json.tmp" && mv "$EXT_DIR/SOURCE.json.tmp" "$EXT_DIR/SOURCE.json"

[ -f "$LOCK_FILE" ] || echo '{"extensions": []}' > "$LOCK_FILE"
jq \
  --arg id "$EXT_ID" \
  --arg version "$VERSION" \
  --arg commit "$COMMIT" \
  --arg date "$DATE" \
  '.extensions = ([.extensions[] | select(.id != $id)] + [{id: $id, version: $version, commit: $commit, dateAdded: $date, dateUpdated: $date}])' \
  "$LOCK_FILE" > "$LOCK_FILE.tmp" && mv "$LOCK_FILE.tmp" "$LOCK_FILE"

BUILT_VSIX="$(find "$EXT_DIR/build" -maxdepth 1 -name '*.vsix' 2>/dev/null | sort | tail -1)"

echo
echo "==> Done: $EXT_ID vendored at $EXT_DIR"
echo "    heuristics: $HEURISTICS_STATUS"
echo "    claude:     $CLAUDE_STATUS"
echo
echo "    Review the findings:"
echo "      $EXT_DIR/REVIEW.heuristics.md"
echo "      $EXT_DIR/REVIEW.claude.md"

if [ "$HEURISTICS_STATUS" = "flagged" ]; then
  echo
  echo "    !! Heuristic check flagged a HARD FAIL issue -- read REVIEW.heuristics.md" >&2
  echo "    !! carefully before installing. This is not a false-positive-proof check." >&2
fi

if [ -t 0 ]; then
  echo
  read -r -p "Install $EXT_ID now? [y/N] " REPLY
  case "$REPLY" in
    [yY]|[yY][eE][sS])
      "$SCRIPT_DIR/lib/install_vsix.sh" "$BUILT_VSIX"
      ;;
    *)
      echo "Not installed. Run this when ready:"
      echo "  $SCRIPT_DIR/install_extension.sh $EXT_ID"
      ;;
  esac
else
  echo
  echo "    Not installed (no interactive terminal). Run this when ready:"
  echo "      $SCRIPT_DIR/install_extension.sh $EXT_ID"
fi
