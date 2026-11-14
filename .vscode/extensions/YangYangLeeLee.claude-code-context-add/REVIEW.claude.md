# Claude-driven security review

I have now read every file in the extension source. Here's the full review.

## Summary

This is a small, legitimate-looking VS Code extension (~500 lines of TS across 6 files) that sends `@file` and `@file:line` references to a Claude Code terminal or the official Claude Code VS Code extension panel. I read all source files, the built `dist/extension.js`, config files, tests, and `package-lock.json`.

### 1. Data reads/writes/transmission beyond stated purpose
None found. The extension only:
- Reads file URIs passed by VS Code context menus, the active editor's URI, and the active text selection (all local, user-initiated).
- Reads terminal names, terminal CWD, and a user-configurable regex list (`terminalNamePatterns`) from workspace settings.
- Writes text into a terminal via `terminal.sendText()` or into the Claude Code panel via the official `claude-vscode.insertAtMention` command.
- Opens files as preview tabs (`panelSender.ts:31-34`) only to make `insertAtMention` (which reads `activeTextEditor`) target the right file — no file *contents* are read or exfiltrated, only the URI/path.

No telemetry, no analytics pings, no data sent anywhere outside the local VS Code process.

### 2. Obfuscated/minified/generated code checked in as source
- `dist/extension.js` is present on disk but is **git-ignored** (`.gitignore:2`) and is a straight esbuild bundle of the TS source (`npm run build`), not something added as hand-written "source." I diffed its logic against the `.ts` files line-by-line — it's a faithful, unobfuscated minification (variable renaming only, from esbuild's `--minify`/bundling). Nothing extra was smuggled in.
- No other minified/obfuscated files exist in `src/`.

### 3. Network calls
**None.** Grep across all `.ts`/`.js` files for `fetch`, `http(s)`, `axios`, `XMLHttpRequest`, `WebSocket`, etc. returned zero network APIs. The only "requests" are `vscode.commands.executeCommand(...)` calls to a command owned by another local extension (`anthropic.claude-code`). `package-lock.json` resolves 100% of packages from `https://registry.npmjs.org/` with no `postinstall`/`preinstall` scripts.

### 4. eval/Function/child_process/shell-out
**None.** The only dynamic-code-adjacent construct is `new RegExp(pattern, 'i')` in `matching.ts:13` (and mirrored in `terminalDetector.ts`), used to test user-configured terminal-name patterns from the `claudeContextAdd.terminalNamePatterns` setting, wrapped in try/catch. This is standard regex use, not code execution — a malformed pattern just throws and is silently skipped, no ReDoS-class patterns are auto-fetched or executed as code. `terminal.sendText(text, false)` writes literal text into the terminal *without* pressing Enter — it does not execute anything on its own; the user must review and hit Enter themselves (documented deliberately in `CLAUDE.md` as a safety design choice). No `child_process`, `exec`, `spawn`, or `eval`/`Function` constructor usage anywhere.

### Other observations (not security issues, but worth flagging)
- `package.json:11-14` lists an `internalRepository` pointing to `http://git.domob-inc.cn/...` (an internal/company git server, plain HTTP) alongside the public GitHub repo. This is just metadata (not fetched or executed by the extension) but indicates the publisher's fork is maintained by a specific organization — worth being aware of if you care about publisher provenance, though it has no runtime effect.
- It's a fork of `jeffycyang/claude-vscode-context-plus`, MIT-licensed, with a plausible, narrow feature set matching its stated purpose exactly.

## Verdict: **SAFE**

The extension's behavior is fully accounted for by its stated purpose — inserting `@file` references into a terminal or the official Claude Code panel. No network egress, no obfuscation, no shell/eval usage, no data collection beyond what's needed to build the reference strings, and the minified `dist/` build matches the readable source exactly.

---
Generated: 2026-07-31T14:01:07Z
