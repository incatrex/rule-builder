#!/usr/bin/env bash
# ================================================================================
DESC="Resolve a VS Code Marketplace extension ID to its source repo, version, and vsix URL"
# ================================================================================

HELP="\
${DESC}

Usage: ./resolve_source.sh <publisher>.<name>

Args:
  <publisher>.<name>   Marketplace extension ID, e.g. YangYangLeeLee.claude-code-context-add
  -h, --help           Show this help

Outputs a single JSON object on stdout:
  { \"extensionId\", \"version\", \"sourceRepo\", \"vsixUrl\" }

Examples:
  ./resolve_source.sh YangYangLeeLee.claude-code-context-add"

set -euo pipefail

usage() { printf '%s\n' "$HELP"; }
die()   { printf 'Error: %s\nRun with --help for usage.\n' "$1" >&2; exit 1; }

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  "") die "missing <publisher>.<name> argument" ;;
esac

EXT_ID="$1"
command -v curl >/dev/null 2>&1 || die "curl is required"
command -v jq >/dev/null 2>&1 || die "jq is required"

QUERY="$(jq -n --arg id "$EXT_ID" '{filters: [{criteria: [{filterType: 7, value: $id}]}], flags: 914}')"

RESPONSE="$(curl -sf -X POST "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json;api-version=3.0-preview.1" \
  -d "$QUERY")" || die "failed to query the marketplace for $EXT_ID"

EXT_JSON="$(echo "$RESPONSE" | jq -e '.results[0].extensions[0]')" \
  || die "extension not found on the marketplace: $EXT_ID"

VERSION="$(echo "$EXT_JSON" | jq -r '.versions[0].version')"

SOURCE_REPO="$(echo "$EXT_JSON" | jq -r '
  (.versions[0].properties // [])
  | map(select(.key == "Microsoft.VisualStudio.Services.Links.Source"
             or .key == "Microsoft.VisualStudio.Services.Links.GitHub"))
  | (.[0].value // "")
')"
[ -n "$SOURCE_REPO" ] || die "no source repository link published for $EXT_ID"

VSIX_URL="$(echo "$EXT_JSON" | jq -r '
  (.versions[0].files // [])
  | map(select(.assetType == "Microsoft.VisualStudio.Services.VSIXPackage"))
  | (.[0].source // "")
')"
[ -n "$VSIX_URL" ] || die "no downloadable .vsix found for $EXT_ID"

jq -n \
  --arg extensionId "$EXT_ID" \
  --arg version "$VERSION" \
  --arg sourceRepo "$SOURCE_REPO" \
  --arg vsixUrl "$VSIX_URL" \
  '{extensionId: $extensionId, version: $version, sourceRepo: $sourceRepo, vsixUrl: $vsixUrl}'
