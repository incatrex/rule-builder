#!/usr/bin/env bash
# ================================================================================
DESC="Update a vendored extension to the latest (or a specific) source ref, after review"
# ================================================================================

HELP="\
${DESC}

Usage: ./update_extension.sh <publisher>.<name> [--ref <branch|tag|commit>] [--skip-heuristics] [--skip-claude-review] [--yes]

Args:
  <publisher>.<name>     Already-vendored extension to update
  --ref <ref>            Git ref to update to instead of the source repo's default branch
  --skip-heuristics      Don't run the heuristic pattern scan
  --skip-claude-review   Don't run the Claude-driven review
  --yes                  Don't prompt for confirmation after showing the diff
  -h, --help             Show this help

Shows the diff stat between the currently-pinned commit and the new one, re-runs
both security checks against the new code, and only then overwrites the vendored
src/ and rebuilds the .vsix. Never reinstalls -- run install_vsix.sh on the new
build yourself once satisfied (sync_extensions.sh will NOT pick up an in-place
version bump on an already-installed extension, it only fills in what's missing).

Examples:
  ./update_extension.sh YangYangLeeLee.claude-code-context-add
  ./update_extension.sh YangYangLeeLee.claude-code-context-add --yes"

set -euo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

EXT_ID=""
REF=""
SKIP_HEURISTICS=0
SKIP_CLAUDE=0
AUTO_YES=0

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --ref) REF="${2:-}"; [ -n "$REF" ] || die "--ref needs a value"; shift 2 ;;
    --skip-heuristics) SKIP_HEURISTICS=1; shift ;;
    --skip-claude-review) SKIP_CLAUDE=1; shift ;;
    --yes) AUTO_YES=1; shift ;;
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

[ -d "$EXT_DIR" ] || die "$EXT_ID is not vendored yet (use add_extension.sh instead)"
[ -f "$EXT_DIR/SOURCE.json" ] || die "missing $EXT_DIR/SOURCE.json"

command -v git >/dev/null 2>&1 || die "git is required"
command -v jq >/dev/null 2>&1 || die "jq is required"
command -v rsync >/dev/null 2>&1 || die "rsync is required"

OLD_COMMIT="$(jq -r '.commit' "$EXT_DIR/SOURCE.json")"
SOURCE_REPO="$(jq -r '.sourceRepo' "$EXT_DIR/SOURCE.json")"

echo "==> Resolving $EXT_ID on the marketplace"
RESOLVED="$("$SCRIPT_DIR/lib/resolve_source.sh" "$EXT_ID")"
NEW_VERSION="$(echo "$RESOLVED" | jq -r '.version')"
VSIX_URL="$(echo "$RESOLVED" | jq -r '.vsixUrl')"

TMP_CLONE="$(mktemp -d)"
trap 'rm -rf "$TMP_CLONE"' EXIT

echo "==> Cloning source"
git clone --quiet "$SOURCE_REPO" "$TMP_CLONE"
if [ -n "$REF" ]; then
  git -C "$TMP_CLONE" checkout --quiet "$REF"
fi
NEW_COMMIT="$(git -C "$TMP_CLONE" rev-parse HEAD)"

if [ "$NEW_COMMIT" = "$OLD_COMMIT" ]; then
  echo "$EXT_ID is already up to date (commit $OLD_COMMIT)."
  exit 0
fi

echo
echo "==> Changes since last review ($OLD_COMMIT -> $NEW_COMMIT):"
if git -C "$TMP_CLONE" cat-file -e "$OLD_COMMIT" 2>/dev/null; then
  git -C "$TMP_CLONE" --no-pager diff --stat "$OLD_COMMIT" "$NEW_COMMIT"
else
  echo "(old commit not found in current source history -- cannot compute a diff; treat this as a fresh review)"
fi
echo

if [ "$AUTO_YES" -eq 0 ]; then
  read -r -p "Proceed with updating $EXT_ID to $NEW_COMMIT? [y/N] " REPLY
  case "$REPLY" in
    [yY]|[yY][eE][sS]) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

rsync -a --delete --exclude='.git' "$TMP_CLONE"/ "$EXT_DIR/src/"

DATE="$(date -u +%Y-%m-%d)"
jq \
  --arg commit "$NEW_COMMIT" \
  --arg version "$NEW_VERSION" \
  --arg vsixUrl "$VSIX_URL" \
  --arg date "$DATE" \
  '.commit = $commit | .version = $version | .vsixUrl = $vsixUrl | .dateUpdated = $date' \
  "$EXT_DIR/SOURCE.json" > "$EXT_DIR/SOURCE.json.tmp" && mv "$EXT_DIR/SOURCE.json.tmp" "$EXT_DIR/SOURCE.json"

rm -f "$EXT_DIR"/build/*.vsix

echo "==> Rebuilding .vsix"
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
  --arg version "$NEW_VERSION" \
  --arg commit "$NEW_COMMIT" \
  --arg date "$DATE" \
  '.extensions = ([.extensions[] | select(.id != $id)] + [{id: $id, version: $version, commit: $commit, dateAdded: $date, dateUpdated: $date}])' \
  "$LOCK_FILE" > "$LOCK_FILE.tmp" && mv "$LOCK_FILE.tmp" "$LOCK_FILE"

echo
echo "==> Done: $EXT_ID updated to $NEW_VERSION ($NEW_COMMIT)"
echo "    heuristics: $HEURISTICS_STATUS"
echo "    claude:     $CLAUDE_STATUS"
echo "    This does NOT reinstall automatically. Once you're satisfied, run:"
echo "      $SCRIPT_DIR/install_extension.sh $EXT_ID"
