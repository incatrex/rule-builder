#!/usr/bin/env bash
# ================================================================================
DESC="Run a Claude Code-driven security review of a vendored extension's source"
# ================================================================================

HELP="\
${DESC}

Usage: ./security_check_claude.sh <extension_dir>

Args:
  <extension_dir>   Path to a vendored extension folder (contains src/)
  -h, --help        Show this help

Shells out to \`claude\` in headless mode, pointed at <extension_dir>/src, asking
it to read every file and report anything a VS Code extension shouldn't be doing
(network exfiltration, obfuscation, credential harvesting, unexpected file/process
access, etc). Writes the response to <extension_dir>/REVIEW.claude.md.

This is advisory, not a pass/fail gate -- read the output yourself. Exit code only
distinguishes whether the review ran (0) from the \`claude\` CLI being unavailable
in this environment (3).

Examples:
  ./security_check_claude.sh ../YangYangLeeLee.claude-code-context-add"

set -uo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  "") die "missing <extension_dir> argument" ;;
esac

EXT_DIR="$(cd "$1" 2>/dev/null && pwd)" || die "no such directory: $1"
SRC_DIR="$EXT_DIR/src"
[ -d "$SRC_DIR" ] || die "no src/ found under $EXT_DIR"

REVIEW="$EXT_DIR/REVIEW.claude.md"

if ! command -v claude >/dev/null 2>&1; then
  {
    echo "# Claude-driven security review"
    echo
    echo "Skipped: the \`claude\` CLI is not available in this environment."
  } > "$REVIEW"
  echo "Warning: 'claude' CLI not found; skipped Claude-driven review." >&2
  exit 3
fi

PROMPT="You are reviewing the source of a VS Code extension before it is trusted and installed. The full source is in the current directory. Read every file (not just a sample) and report: (1) anything that reads, writes, or transmits data beyond what the extension's stated purpose requires, (2) any obfuscated, minified, or dynamically generated code checked in as source, (3) any network calls and exactly what they send and to where, (4) any use of eval/Function/child_process/shell-out and why, (5) an overall verdict: SAFE, SAFE WITH NOTES, or DO NOT INSTALL, with reasoning. Be specific about file names and line numbers."

{
  echo "# Claude-driven security review"
  echo
} > "$REVIEW"

(cd "$SRC_DIR" && claude -p "$PROMPT") >> "$REVIEW" 2>&1
STATUS=$?

{
  echo
  echo "---"
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} >> "$REVIEW"

exit $STATUS
