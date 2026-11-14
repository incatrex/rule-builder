#!/usr/bin/env bash
# ================================================================================
DESC="Tests for lib/find_code_bin.sh IPC socket selection and sync_extensions.sh hang safety"
# ================================================================================
#
# Uses a fake `code` binary (via CODE_CLI) that answers instantly for sockets
# whose name contains "live" and hangs for any other, plus real Unix sockets
# created with python3 in a temp VSCODE_IPC_DIR.
#
# Usage: ./test_find_code_bin.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TMP="$(mktemp -d)"
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$TMP"' EXIT

FAKE_CODE="$TMP/code"
cat > "$FAKE_CODE" <<'EOF'
#!/usr/bin/env bash
case "${VSCODE_IPC_HOOK_CLI:-}" in
  *live*) echo "some.extension"; exit 0 ;;
  *) sleep 60 ;;
esac
EOF
chmod +x "$FAKE_CODE"

make_sock() {  # make_sock <path> <mtime-epoch>
  python3 -c 'import socket,sys; socket.socket(socket.AF_UNIX).bind(sys.argv[1])' "$1"
  touch -h -d "@$2" "$1"
}

PASS=0; FAIL=0
check() {  # check <name> <condition-exit-code>
  if [ "$2" -eq 0 ]; then PASS=$((PASS+1)); echo "PASS: $1"; else FAIL=$((FAIL+1)); echo "FAIL: $1"; fi
}

new_dir() { local d="$TMP/$1"; mkdir -p "$d"; echo "$d"; }

export CODE_CLI="$FAKE_CODE"
export CODE_IPC_PROBE_TIMEOUT=1
now="$(date +%s)"

# 1. Newest socket is dead; an older live one must be chosen.
d="$(new_dir t1)"
make_sock "$d/vscode-ipc-live-a.sock" "$((now-10))"
make_sock "$d/vscode-ipc-dead-b.sock" "$now"
out="$(env -u VSCODE_IPC_HOOK_CLI VSCODE_IPC_DIR="$d" bash -c \
  "source '$SCRIPTS_DIR/lib/find_code_bin.sh'; ensure_vscode_ipc_hook \"\$(find_code_bin)\" && echo \"\$VSCODE_IPC_HOOK_CLI\"")"
[ "$out" = "$d/vscode-ipc-live-a.sock" ]; check "skips dead newest socket, picks live one" $?

# 2. All sockets dead: returns non-zero, bounded by probe timeout.
d="$(new_dir t2)"
make_sock "$d/vscode-ipc-dead-a.sock" "$now"
make_sock "$d/vscode-ipc-dead-b.sock" "$now"
start=$SECONDS
env -u VSCODE_IPC_HOOK_CLI VSCODE_IPC_DIR="$d" timeout 20 bash -c \
  "source '$SCRIPTS_DIR/lib/find_code_bin.sh'; ensure_vscode_ipc_hook \"\$(find_code_bin)\""
rc=$?
[ "$rc" -ne 0 ] && [ "$rc" -ne 124 ]; check "all dead -> non-zero (rc=$rc)" $?
[ $((SECONDS-start)) -lt 10 ]; check "all dead -> returns quickly ($((SECONDS-start))s)" $?

# 3. Inherited live value is kept even if a newer live socket exists.
d="$(new_dir t3)"
make_sock "$d/vscode-ipc-live-inherited.sock" "$((now-100))"
make_sock "$d/vscode-ipc-live-newer.sock" "$now"
out="$(VSCODE_IPC_HOOK_CLI="$d/vscode-ipc-live-inherited.sock" VSCODE_IPC_DIR="$d" bash -c \
  "source '$SCRIPTS_DIR/lib/find_code_bin.sh'; ensure_vscode_ipc_hook \"\$(find_code_bin)\" && echo \"\$VSCODE_IPC_HOOK_CLI\"")"
[ "$out" = "$d/vscode-ipc-live-inherited.sock" ]; check "keeps live inherited socket" $?

# 4. Inherited dead value is replaced by a live one.
d="$(new_dir t4)"
make_sock "$d/vscode-ipc-dead-inherited.sock" "$now"
make_sock "$d/vscode-ipc-live-other.sock" "$((now-10))"
out="$(VSCODE_IPC_HOOK_CLI="$d/vscode-ipc-dead-inherited.sock" VSCODE_IPC_DIR="$d" bash -c \
  "source '$SCRIPTS_DIR/lib/find_code_bin.sh'; ensure_vscode_ipc_hook \"\$(find_code_bin)\" && echo \"\$VSCODE_IPC_HOOK_CLI\"")"
[ "$out" = "$d/vscode-ipc-live-other.sock" ]; check "replaces dead inherited socket" $?

# 5. sync_extensions.sh with no live socket: warns, exits 0, doesn't hang.
d="$(new_dir t5)"
make_sock "$d/vscode-ipc-dead-a.sock" "$now"
start=$SECONDS
err="$(env -u VSCODE_IPC_HOOK_CLI VSCODE_IPC_DIR="$d" timeout 20 "$SCRIPTS_DIR/sync_extensions.sh" 2>&1 >/dev/null)"
rc=$?
[ "$rc" -eq 0 ]; check "sync exits 0 with no live socket (rc=$rc)" $?
grep -qi "no responsive" <<< "$err"; check "sync warns about no responsive socket" $?
[ $((SECONDS-start)) -lt 10 ]; check "sync returns quickly ($((SECONDS-start))s)" $?

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
