#!/bin/bash
# Non-interactive check that the build, run and test scripts work for both
# front and back end, and that dependencies have no known vulnerabilities.
#
# Usage: scripts/verify.sh [--skip-audit] [--skip-e2e]
#
# Exits non-zero if any check fails. Prints a summary at the end.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${VERIFY_LOG_DIR:-$ROOT/.verify-logs}"
mkdir -p "$LOG_DIR"

SKIP_AUDIT=0
SKIP_E2E=0
for arg in "$@"; do
  case "$arg" in
    --skip-audit) SKIP_AUDIT=1 ;;
    --skip-e2e) SKIP_E2E=1 ;;
    *) echo "Unknown option: $arg"; exit 2 ;;
  esac
done

RESULTS=()
FAILED=0

record() { # name status
  RESULTS+=("$2  $1")
  [ "$2" = "PASS" ] || FAILED=1
}

run_check() { # name timeout_seconds command...
  local name="$1" t="$2"; shift 2
  local log="$LOG_DIR/$(echo "$name" | tr ' /' '__').log"
  echo "▶ $name (log: $log)"
  if timeout "$t" "$@" > "$log" 2>&1 < /dev/null; then
    record "$name" PASS
  else
    local rc=$?
    [ $rc -eq 124 ] && echo "  timed out after ${t}s"
    record "$name (exit $rc)" FAIL
  fi
}

wait_http() { # url timeout_seconds
  local url="$1" t="$2" i=0
  while [ $i -lt "$t" ]; do
    curl -fsS -o /dev/null "$url" 2>/dev/null && return 0
    sleep 1; i=$((i + 1))
  done
  return 1
}

port_free() { ! (exec 3<>/dev/tcp/127.0.0.1/"$1") 2>/dev/null; }

stop_tree() { # pid
  local pid="$1"
  [ -z "$pid" ] && return
  pkill -TERM -P "$pid" 2>/dev/null
  kill -TERM "$pid" 2>/dev/null
  sleep 2
  pkill -KILL -P "$pid" 2>/dev/null
  kill -KILL "$pid" 2>/dev/null
}

smoke_server() { # name script port url timeout
  local name="$1" script="$2" port="$3" url="$4" t="$5"
  local log="$LOG_DIR/$(echo "$name" | tr ' /' '__').log"
  echo "▶ $name (log: $log)"
  if ! port_free "$port"; then
    echo "  port $port already in use; stop the running server first"
    record "$name (port $port busy)" FAIL
    return
  fi
  setsid "$script" > "$log" 2>&1 < /dev/null &
  local pid=$!
  if wait_http "$url" "$t"; then
    record "$name" PASS
  else
    record "$name (no response from $url in ${t}s)" FAIL
  fi
  # setsid makes the script a process-group leader: kill the whole group
  kill -TERM -- -"$pid" 2>/dev/null
  sleep 3
  kill -KILL -- -"$pid" 2>/dev/null
  stop_tree "$pid"
}

cd "$ROOT"

# 1. Build: install.sh builds backend + frontend and bundles the UI into the jar
run_check "install.sh" 900 "$SCRIPT_DIR/install.sh"
JAR="$ROOT/backend/target/rule-builder-backend-1.0.0.jar"
# The jar must carry the frontend that install.sh just built (not a stale copy)
if [ -f "$JAR" ] && [ -f "$ROOT/frontend/dist/index.html" ] && \
   diff -q <(unzip -p "$JAR" BOOT-INF/classes/static/app/index.html 2>/dev/null) \
           "$ROOT/frontend/dist/index.html" > /dev/null; then
  record "jar contains freshly built frontend" PASS
else
  record "jar contains freshly built frontend" FAIL
fi

# 2. Unit tests: test.sh must finish even when run from a terminal (TTY),
#    where a bare `vitest` would enter watch mode and never exit.
run_check "test.sh (under a TTY)" 900 script -qefc "$SCRIPT_DIR/test.sh" /dev/null

# 3. Run scripts: each server must come up and answer HTTP
smoke_server "start-backend.sh" "$SCRIPT_DIR/start-backend.sh" 8080 \
  "http://localhost:8080/api/v1/rules/ui/config" 120
smoke_server "start-frontend.sh" "$SCRIPT_DIR/start-frontend.sh" 3003 \
  "http://localhost:3003/" 60

# 4. E2E: test-e2e.sh must run without prompts when given a selection
if [ $SKIP_E2E -eq 0 ]; then
  run_check "test-e2e.sh all" 1200 "$SCRIPT_DIR/test-e2e.sh" all
fi

# 5. Vulnerabilities
if [ $SKIP_AUDIT -eq 0 ]; then
  run_check "npm audit (frontend)" 120 bash -c "cd '$ROOT/frontend' && npm audit"
fi

echo ""
echo "========================================="
echo "Verify summary"
echo "========================================="
printf '%s\n' "${RESULTS[@]}"
echo "========================================="
exit $FAILED
