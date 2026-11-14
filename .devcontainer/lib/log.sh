#!/usr/bin/env bash
# Shared logging helper for devcontainer lifecycle scripts (postCreate/postStart/postAttach).
# Formalizes the "==> message" step-announcement convention already in informal use.

log_step() {
  echo "==> $*"
}

log_no_steps() {
  echo "==> [$1] No steps defined for this repo."
}
