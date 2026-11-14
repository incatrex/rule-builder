#!/usr/bin/env bash
set -euo pipefail

# Devcontainer attach steps:
# - Apply the devcontainer VS Code settings profile.
# - Sync vetted VS Code extensions (the 'code' CLI shim only works after attach).
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/.devcontainer/lib/log.sh"

log_step "Applying devcontainer VS Code settings profile"
"$ROOT_DIR/scripts/set_profile.sh" --devcontainer

log_step "Syncing vetted VS Code extensions"
"$ROOT_DIR/.vscode/extensions/scripts/sync_extensions.sh"
