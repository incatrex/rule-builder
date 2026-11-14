#!/usr/bin/env bash
# ================================================================================
DESC="Print the path to a usable VS Code / VS Code Server CLI binary, or exit 1"
# ================================================================================
#
# Lifecycle hooks (postCreate/postStart/postAttach) run via `docker exec` with
# the container's base PATH, which does not include the remote-cli directory
# VS Code Server injects into its own integrated-terminal sessions. On many
# base images, `code` on the base PATH is a stub (e.g. /usr/local/bin/code)
# that tries to locate the real remote-cli binary itself and fails outside a
# VS Code-spawned shell. Search known remote-cli locations directly first,
# falling back to whatever `code`/`code-insiders` normal PATH lookup finds.

find_code_bin() {
  if [ -n "${CODE_CLI:-}" ]; then
    [ -x "$CODE_CLI" ] && { echo "$CODE_CLI"; return 0; }
    return 1
  fi
  local candidate
  for candidate in \
    /vscode/vscode-server/bin/*/bin/remote-cli/code \
    "${HOME:-/root}"/.vscode-server/bin/*/bin/remote-cli/code \
    "${HOME:-/root}"/.vscode-server-insiders/bin/*/bin/remote-cli/code
  do
    [ -x "$candidate" ] && { echo "$candidate"; return 0; }
  done
  command -v code 2>/dev/null || command -v code-insiders 2>/dev/null
}

# Run the code CLI with a timeout so a wedged VS Code server can't block a
# lifecycle hook forever. Usage: run_code <code-bin> <args...>
run_code() {
  local bin="$1"; shift
  timeout "${CODE_CLI_TIMEOUT:-120}" "$bin" "$@"
}

# The remote-cli binary itself refuses to run ("Command is only available in
# WSL or inside a Visual Studio Code terminal") unless VSCODE_IPC_HOOK_CLI
# points to the live IPC socket of an attached VS Code window. That variable
# is only injected into processes VS Code spawns directly (integrated
# terminals, extension hosts) -- lifecycle hooks run outside that process
# tree and never get it. If it's missing, scan our vscode-ipc-*.sock files.
#
# Socket mtimes can't be trusted to pick the right one: after a rebuild
# several sockets share the same mtime, and some accept connections but never
# answer, which makes every CLI call hang. So probe each candidate (inherited
# value first, then newest first) with a short timeout and export the first
# that responds. Returns 1 if none do.
#
# Usage: ensure_vscode_ipc_hook <code-bin>
# Env:   CODE_IPC_PROBE_TIMEOUT (seconds per socket, default 5)
#        VSCODE_IPC_DIR (where to look for sockets, default /tmp)
ensure_vscode_ipc_hook() {
  local bin="$1" sock
  while IFS= read -r sock; do
    [ -S "$sock" ] || continue
    if VSCODE_IPC_HOOK_CLI="$sock" timeout "${CODE_IPC_PROBE_TIMEOUT:-5}" \
         "$bin" --list-extensions >/dev/null 2>&1; then
      export VSCODE_IPC_HOOK_CLI="$sock"
      return 0
    fi
  done < <(
    [ -n "${VSCODE_IPC_HOOK_CLI:-}" ] && echo "$VSCODE_IPC_HOOK_CLI"
    find "${VSCODE_IPC_DIR:-/tmp}" -maxdepth 1 -user "$(id -u)" -name 'vscode-ipc-*.sock' -printf '%T@ %p\n' 2>/dev/null \
      | sort -rn | cut -d' ' -f2-
  )
  return 1
}
