# Vendored VS Code Extensions

This folder is a self-contained system for pulling in third-party VS Code extensions
you actually want to use, while keeping an auditable copy of their source, a record of
what was checked, and the exact `.vsix` you installed from — instead of just trusting
whatever the Marketplace serves you.

Everything needed to add, review, build, sync, and update extensions lives under this
one folder (`.vscode/extensions/`), including the scripts themselves. That's deliberate:
you can copy this whole folder into another project and it works there too, with no
dependency on anything outside it (see **Portability**, below).

Extensions vendored here are **never installed automatically**. Every script stops
short of that — installing into your running VS Code/devcontainer is always a
separate, explicit step you run yourself.

## Directory layout

```
.vscode/extensions/
  README.md                  # this file
  .gitignore                 # ignores src/node_modules and .DS_Store
  extensions.lock.json        # index of every vendored extension: id, version, commit
  scripts/
    add_extension.sh          # vendor a NEW extension
    update_extension.sh       # bump an already-vendored extension
    sync_extensions.sh        # install whatever's vendored but missing locally
    install_extension.sh      # install/reinstall one vendored extension by ID
    lib/
      resolve_source.sh       # marketplace ID -> source repo + version + vsix URL
      build_vsix.sh           # build a .vsix from vendored source
      security_check_heuristics.sh   # pattern scan + marketplace-vsix provenance check
      security_check_claude.sh       # Claude-driven read-through of the source
      install_vsix.sh          # code --install-extension <path> -- shared by the above, not meant to be called directly
      find_code_bin.sh         # locate the code CLI + pick a responsive IPC socket (probed with a timeout)
    tests/
      test_find_code_bin.sh    # IPC socket selection / no-hang tests; run directly
  <publisher>.<name>/          # one folder per vendored extension, created by add_extension.sh
    SOURCE.json                # provenance: repo, pinned commit, version, review status
    REVIEW.heuristics.md        # output of the pattern scan + provenance check
    REVIEW.claude.md             # output of the Claude-driven review
    src/                          # vendored source at the pinned commit (tracked in git)
    build/<name>-<version>.vsix    # built from src/ (tracked in git)
```

## Workflow

### 1. Add a new extension

```
scripts/add_extension.sh <publisher>.<name> [--ref <branch|tag|commit>] [--skip-heuristics] [--skip-claude-review]
```

What it does, in order:
1. Looks up `<publisher>.<name>` on the Marketplace to find its published source
   repository, latest version, and `.vsix` download URL.
2. Clones that repository (at `--ref` if given, otherwise its default branch) and
   copies it into `<publisher>.<name>/src/`, recording the exact commit SHA.
3. Builds a `.vsix` from that vendored source into `<publisher>.<name>/build/`.
4. Runs the heuristic pattern scan (unless `--skip-heuristics`).
5. Runs the Claude-driven review (unless `--skip-claude-review`).
6. Writes `SOURCE.json` and updates `extensions.lock.json` with the result.

It refuses to run if the extension is already vendored (use `update_extension.sh`
instead), and it never installs anything without asking: once both checks finish,
it prints the paths to both review files and — if run in an interactive terminal —
prompts `Install <id> now? [y/N]` before doing anything further. Say no (or run it
non-interactively) and it just tells you the command to run later instead.

### 2. Read the review output

- `REVIEW.heuristics.md` — a pattern scan for risky code (`eval`, `child_process`,
  network calls, postinstall scripts, suspiciously long/minified lines), plus a
  **provenance check**: it downloads the actual Marketplace-published `.vsix` and
  diffs its bundled JS against the one built from the vendored source. A mismatch
  is a hard fail — it means the published binary contains code the public source
  doesn't show.
- `REVIEW.claude.md` — a full read-through by Claude Code itself: what the
  extension actually does, any data it reads/writes/transmits, any obfuscation,
  any network calls, any dynamic code execution, and an overall verdict.

Both are advisory documents meant for you to read, not just a pass/fail gate —
`SOURCE.json`'s `review.heuristics.status` / `review.claude.status` fields record
the outcome (`pass`/`flagged`/`skipped` and `reviewed`/`skipped_no_tool`/`skipped`
respectively) but the point is to actually read them before trusting the code.

### 3. Install it

```
scripts/install_extension.sh <publisher>.<name>
```

Resolves the current `build/*.vsix` for that extension and installs it — always,
whether or not it's already installed, so it also works to apply an update. This
is the one command you need to remember; you should never have to reach into
`lib/` yourself. Installing is always a separate, deliberate step — nothing in
`add_extension.sh` installs without asking first (see above), and
`update_extension.sh` never installs on its own at all.

### 4. Update an already-vendored extension

```
scripts/update_extension.sh <publisher>.<name> [--ref <ref>] [--skip-heuristics] [--skip-claude-review] [--yes]
```

Resolves the latest version, clones it, and — if the commit actually changed —
shows a `diff --stat` between the old pinned commit and the new one before
prompting you to confirm (pass `--yes` to skip the prompt, e.g. for scripting).
Only after confirmation does it overwrite `src/`, rebuild the `.vsix`, and
re-run both security checks against the new code.

It does **not** reinstall automatically, and note: `sync_extensions.sh` won't
pick up an in-place version bump on an extension that's already installed —
it only fills in what's *missing*. To actually apply an update, run
`scripts/install_extension.sh <publisher>.<name>` — it always installs the
current build regardless of what's already present.

### 5. Sync a fresh environment (new clone / new devcontainer)

```
scripts/sync_extensions.sh [<publisher>.<name>]
```

With no argument, walks every vendored extension folder and installs any whose
ID isn't already present in `code --list-extensions`, using the `.vsix` already
sitting in `build/` — no re-fetching, no re-review, no rebuilding. Pass a single
`<publisher>.<name>` to sync just that one. Never hard-fails the batch: a missing
`.vsix` or a failed install just prints a warning and moves on to the next one
(an explicit bad argument is still a hard error). This is wired into
`.devcontainer/postCreate.sh` as a single, commentable line, so a fresh devcontainer
picks up everything already vendored-and-reviewed in the repo automatically.

## Scripts reference

| Script | Arguments | Purpose |
|---|---|---|
| `scripts/add_extension.sh` | `<publisher>.<name>` `[--ref <ref>]` `[--skip-heuristics]` `[--skip-claude-review]` | Vendor a brand-new extension |
| `scripts/update_extension.sh` | `<publisher>.<name>` `[--ref <ref>]` `[--skip-heuristics]` `[--skip-claude-review]` `[--yes]` | Bump an already-vendored extension |
| `scripts/sync_extensions.sh` | `[<publisher>.<name>]` | Install whatever's vendored but missing locally |
| `scripts/install_extension.sh` | `<publisher>.<name>` | Install/reinstall one vendored extension's current build |
| `scripts/lib/resolve_source.sh` | `<publisher>.<name>` | Print `{extensionId, version, sourceRepo, vsixUrl}` as JSON |
| `scripts/lib/build_vsix.sh` | `<src_dir> <out_dir>` | Build a `.vsix` from source into `out_dir` |
| `scripts/lib/security_check_heuristics.sh` | `<extension_dir>` | Pattern scan + marketplace-vsix provenance diff |
| `scripts/lib/security_check_claude.sh` | `<extension_dir>` | Claude-driven read-through and verdict |
| `scripts/lib/install_vsix.sh` | `<path-to-vsix>` | `code --install-extension <path>` — internal plumbing shared by `sync_extensions.sh`, `install_extension.sh`, and `add_extension.sh`'s install prompt; not meant to be called directly |

Every script supports `-h`/`--help`.

## Trusted (unvendored) extensions

Not everything needs this treatment — e.g. Anthropic's own `anthropic.claude-code`
extension, or other extensions you trust outright without an audit trail. Those go
in the existing `customizations.vscode.extensions` array in
`.devcontainer/devcontainer.json` instead, which is the native Dev Containers
mechanism for "install this from the Marketplace, no review needed." There's no
duplicate list for this inside `.vscode/extensions/` — reuse what's already there.

## Prerequisites

`git`, `jq`, `curl`, `rsync`, `npm`/`npx`, and the `code` CLI must be on `PATH`.
The Claude-driven review additionally needs the `claude` CLI
(`npm install -g @anthropic-ai/claude-code`) — if it's missing, that check is
skipped (`skipped_no_tool`) rather than failing the whole run, so the rest of the
pipeline still works without it. This devcontainer installs it automatically via
`.devcontainer/postCreate.sh`.

## Portability

Every script locates itself relative to its own file path (the same pattern
`scripts/set_profile.sh` uses at the project root), never relative to anything
outside this folder. That means `.vscode/extensions/` can be copied wholesale into
a different project and it works immediately — your whole vetted-extension
library, source, reviews, and built `.vsix` files travel with it. The only things
that don't live inside this folder on principle: the `.vsix`'s dependency tree
(`src/node_modules/`, gitignored) and the actual installed extension, which VS Code
always keeps in its own environment-level extensions directory, not in the repo.
