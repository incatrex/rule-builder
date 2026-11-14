---
status: done
---

# Repo refresh: working scripts and vulnerable package updates

## Request

> please refresh this repo - make sure that build, run and test scripts work for both front and back end.  update packages that need it to address any vulnerabilities

## Summary

Get the repo back to a clean, working baseline:

1. **Scripts.** Check that every script in `scripts/` that builds, runs or tests the app works end to end, and fix any that don't:
   - `install.sh`: `mvn clean install`, `npm install`, `npm run build`, then copies `dist/` into backend static.
   - `start-backend.sh`: `mvn spring-boot:run` on :8080.
   - `start-frontend.sh`: `vite` dev server on :3003.
   - `test.sh`: `mvn test` + `npm test`.
   - `test-e2e.sh`: starts both apps and opens an interactive Playwright menu.
   - `test-clean.sh`: deletes the TEST_* rule files that tests leave behind.
2. **Vulnerabilities.** Update dependencies until `npm audit` is clean, or as clean as it can reasonably get, and fix known CVEs in backend dependencies.

### Current state (2026-11-14)

- Toolchain: Java 17.0.21, Maven 3.10.0, Node 20.20.2, npm 10.8.2.
- **Frontend `npm audit`: 23 vulnerabilities (2 critical, 13 high, 6 moderate, 2 low).**
  - Direct deps affected: `vitest` / `@vitest/ui` (critical), `axios`, `immutable`, `lodash`, `vite` (high), `moment` (moderate).
  - Almost all can be fixed within semver (`npm audit fix`). The exception is **`vite` / `esbuild`**: the only fix is a major jump, **vite 5 → 8**. That also means bumping `@vitejs/plugin-react` and possibly changing `vite.config.js`.
  - Also old but not flagged: `jsdom` 22, `@testing-library/react` 14.
- **Backend:** Spring Boot **3.2.0** (Nov 2023, out of OSS support), `springdoc-openapi` 2.3.0, `json-schema-validator` 1.0.87. Spring Boot 3.2.0 has known CVEs (spring-web, Tomcat, and others). `mvn` has no built-in audit, so I'll use the OWASP `dependency-check-maven` plugin, or check advisories manually if its NVD download is too slow or rate-limited.
- **Script issues spotted so far:**
  - `test.sh` runs `npm test` → `vitest`, which is **watch mode**. It never exits, so the script hangs. It needs `vitest run`.
  - `test-e2e.sh` is interactive (`read` prompts) and uses `sed` to rewrite the port in one spec file. It works for humans but can't run unattended.
  - `install.sh` copies the frontend build into `backend/src/main/resources/static/app` *after* `mvn clean install`, so the packaged jar doesn't contain the latest frontend.

**Assumptions**
- "Work" means each script finishes with exit code 0 (or serves its port, for the run scripts) in this devcontainer, and all existing unit tests pass. Tests that fail for reasons unrelated to the upgrades get recorded and raised with you, not silently changed.
- Upgrades must not change app behaviour. Code changes are limited to what an upgrade forces (API or config changes).
- The `antd` pin (5.24.5) and React 18 stay as they are unless a vulnerability forces a change. React 19 / antd 6 is out of scope.
- `moment` stays (patched within 2.x). Replacing it is out of scope.
- Java stays at 17 (that's what the devcontainer has).
- npm itself (10 → 12) is not upgraded. That's a devcontainer concern.
- Frontend unit tests (`vitest`) and backend tests (`mvn test`) are the main gate. E2E (Playwright) gets run once at the end as a smoke check.
- README run/test instructions get updated if any commands change.

## Plan

1. **Baseline.** Run each script and test suite before changing anything, and record what passes and fails (pass counts, failures).
2. **Write the verification check first.** Add a non-interactive `scripts/verify.sh` (or a `--ci` mode on the existing scripts) that runs the backend build and tests, the frontend install, build and unit tests, and briefly starts each app to check its port. It should fail on today's `test.sh` hang.
3. **Fix scripts:**
   - add a `test:run` script / `vitest run` for `test.sh`
   - fix the `install.sh` order so the frontend is built before the backend jar is packaged
   - make `test-e2e.sh` accept an argument such as `all` so it can run without prompts
4. **Frontend deps:** `npm audit fix`, then bump the direct deps (`axios`, `lodash`, `immutable`, `moment`, `vitest` + `@vitest/ui`), then vite per Clarification 1. Re-run the build and tests after each step.
5. **Backend deps:** bump the Spring Boot parent per Clarification 2, along with `springdoc` and `json-schema-validator` to compatible patched versions. Run `mvn verify` plus the dependency check.
6. Run everything again, plus the Playwright smoke test, and log `npm audit` and dependency-check results before and after.

## Clarifications

1. **Vite major upgrade?** Only a vite 5 → 8 jump clears the vite/esbuild advisories. Those are dev-server-only issues, not in the production bundle.
   - **a) Upgrade to vite 8 (recommended).** Clears the audit fully. The config is small, so the migration risk is low.
   - b) Stay on vite 5.4.x, fix everything else, and document the remaining dev-only advisories.

   > a

2. **Spring Boot target?** We're on 3.2.0.
   - **a) Latest 3.5.x (recommended).** Supported, patched, Java 17 OK, minimal code changes.
   - b) Latest 3.2.x patch only. Smallest change, but 3.2 is out of OSS support, so some CVEs stay.
   - c) Spring Boot 4.x. Bigger migration (Jackson 3, Spring 7). Better as a separate task.

   > a

## Work log

### 2026-11-14 16:07 UTC: Created prompt file
- Inspected `scripts/`, `frontend/package.json`, `backend/pom.xml` and the toolchain versions. Ran `npm audit` (23 vulns) to fill in Current state.
- No code changes. Awaiting answers to 2 clarifications and the go-ahead.

### 2026-11-14 16:10 UTC: Answers received, go-ahead given
- Decisions: **1a** upgrade to vite 8; **2a** Spring Boot latest 3.5.x.
- Status → `in-progress`.

### 2026-11-14 16:12 UTC: Baseline
- **Devcontainer blocker:** `frontend/node_modules` is a named Docker volume (new uncommitted `mounts` entry in `.devcontainer/devcontainer.json`) and is created **owned by root**, so `npm ci` failed with `EACCES` and the folder was empty. Fixed locally with `sudo chown vscode:vscode frontend/node_modules`. Added the same `chown` to the start of `postCreateCommand` so a rebuilt container works.
- Backend `mvn test`: **108 run, 0 failures, 0 errors** (Spring Boot 3.2.0).
- Frontend `npx vitest run` (after `npm ci`): **19 files, 185 tests passed**.
- Frontend `npm run build`: OK (only a >500 kB chunk size warning).
- `scripts/test.sh` with no TTY: exits 0. Correction to the Summary: vitest only enters watch mode when it's attached to a terminal, so the hang happens only when a person runs it from a shell. That's still the normal way to run it.

### 2026-11-14 16:13 UTC: Verification check written first (red)
- Added `scripts/verify.sh`: non-interactive, writes logs to `.verify-logs/` (added to `.gitignore`). It checks:
  1. `install.sh` succeeds **and** the jar contains `static/app/index.html`
  2. `test.sh` finishes when run under a pseudo-TTY (`script -qefc`)
  3. `start-backend.sh` answers `GET /api/v1/rules/ui/config` on :8080
  4. `start-frontend.sh` answers on :3003
  5. `test-e2e.sh all` runs with no prompts (`--skip-e2e` to omit)
  6. `npm audit` is clean (`--skip-audit` to omit)
- First run (`--skip-e2e`): `test.sh (under a TTY)` sat at vitest's "Waiting for file changes..." until the 900s timeout. **Red, as expected.**
- Red run summary: `install.sh` PASS, jar check PASS, **`test.sh (under a TTY)` FAIL (timeout)**, `start-backend.sh` PASS, `start-frontend.sh` PASS, **`npm audit` FAIL**.
- The jar check passed for the wrong reason. `backend/src/main/resources/static/app` already held an older UI build, so the jar contained *some* `index.html`, but it referenced `index-BNnjxC13.js` while the fresh `dist/` had `index-Bkd3jhVf.js`. So the stale-UI bug is real. Tightened the check: the jar's `index.html` must be byte-identical to `frontend/dist/index.html`.
- Noticed, not changed: `static/app/` is **tracked in git**, so every `install.sh` run will show modified files there.

### 2026-11-14 16:40 UTC: Script fixes
- `scripts/install.sh`: builds the **frontend first**, copies `dist/` into `static/app`, **then** runs `mvn -B clean install`, so the jar carries the current UI. Added `set -e` and paths relative to the script, so it runs from any directory.
- `scripts/test.sh`: frontend now runs `npm run test:run` (new `package.json` script, `vitest run`), so it never enters watch mode. Uses `mvn -B test`. Paths are relative to the script.
- `scripts/start-backend.sh`, `scripts/start-frontend.sh`: paths relative to the script (previously only worked from the repo root).
- `scripts/test-e2e.sh`:
  - Takes an optional argument `all | <number> | <spec-file>`. With an argument it never prompts (menu and "Press Enter to exit" skipped); with no argument it keeps the interactive menu.
  - Bug fix: `FRONTEND_PORT=$(start_frontend)` captured the function's status messages as well as the port, giving a multi-line value that was then `sed`-ed into a spec file. The status messages now go to stderr.
- Noticed, not changed: `test-e2e.sh` still rewrites the port inside `e2e/condition-naming-scenarios-sequential.spec.js` with `sed` (changes a tracked file if the port differs from 3003).

### 2026-11-14 16:45 UTC: Frontend dependency updates
- Direct runtime deps: axios 1.13.1→**1.21.1**, lodash 4.17.21→**4.18.1**, immutable 4.3.7→**4.3.9**, moment 2.30.1→**2.31.0**, react-syntax-highlighter 16.1.0→16.1.2.
- Dev deps: **vite 5.4.21→8.3.8**, **@vitejs/plugin-react 4.7.0→6.3.0** (needed for vite 8), vitest + @vitest/ui 4.0.8→**4.1.12** (kept in lockstep; @vitest/ui 5 needs vitest 5), @playwright/test 1.56.1→1.65.1, @testing-library/user-event 14.5.2→14.6.10.
- `npm audit fix` for the transitive deps.
- `npm audit`: **23 vulnerabilities → 0**.
- No `vite.config.js` or `vitest.config.js` changes needed. Node 20.20.2 meets vite 8's `^20.19.0`.
- `npm run build`: OK, now 0.4s (vite 8 / rolldown). The >500 kB chunk warning remains, as before.
- `npm run test:run`: **19 files, 185 tests passed** (same as baseline).
- Left as is: antd 5.24.5 (pinned), React 18, jsdom 22, @testing-library/react 14. All are major bumps, none were flagged by audit.

### 2026-11-14 17:05 UTC: Backend dependency updates
- `backend/pom.xml`: Spring Boot parent **3.2.0 → 3.5.16** (latest 3.5.x), springdoc-openapi **2.3.0 → 2.8.17** (the 2.8 line is built for Boot 3.5; 3.x is for Boot 4).
- **json-schema-validator: tried 1.5.9, reverted, kept at 1.0.87.**
  - With 1.5.9, `mvn test` (after `clean`; incremental compile had hidden it as `NoSuchMethodError`) failed to compile: `ValidationMessage.getPath()` / `getSchemaPath()` were removed.
  - After switching to `getInstanceLocation()` / `getSchemaLocation()`, **3 tests still failed** (`testExpressionGroupMinItems`, `testLineNumber_RootLevelAdditionalProperty`, `testLineNumber_ArrayElement`). 1.5.x rewords user-facing validation messages (e.g. `$.x: is not defined…` → `$: property 'x' is not defined…`), reports `schemaPath` as a full URI, and the line-number lookup depends on the old message format.
  - OSV reports **no vulnerabilities for 1.0.87**, and its runtime deps (Jackson, SnakeYAML) take their versions from Boot. So this upgrade would change behaviour without fixing anything. Reverted the code and the version. Moving to the 1.5/2.x API is a candidate follow-up task.
- Backend scan method: OWASP dependency-check needs a full NVD download (very slow without an API key), so I resolved the runtime tree with `mvn dependency:list -DincludeScope=runtime` and queried the **OSV.dev batch API** (scratch scripts, not committed).
  - **Before (Boot 3.2.0): 49 runtime deps, 14 vulnerable, 94 advisories** (tomcat-embed-core 39, spring-webmvc 15, jackson-databind 12, …).
  - **After Boot 3.5.16: 22 advisories in 6 deps.** Boot 3.5.16 manages versions that are behind current patches.
- Added security patch overrides to `<properties>`, with a comment to remove each once Boot catches up: `tomcat.version` 10.1.55→**10.1.59**, `jackson-bom.version` 2.21.4→**2.21.7**, `log4j2.version` 2.24.3→**2.25.5**, `commons-lang3.version` 3.17.0→**3.18.0**.
- **After overrides: 1 dep, 2 advisories, both not applicable.** spring-webmvc 6.2.19 GHSA-j9f9-w8pj-32f8 (SSE fragment rendering) and GHSA-pc63-qcmh-9cmg (XsltView). Neither has an OSS fix on 6.2.x (fixed only in Spring 7 / Boot 4), and the app uses neither SSE nor XSLT views (`grep` of `src/main`: no matches).
- `mvn -B clean test`: **108 run, 0 failures, 0 errors** (Spring Boot v3.5.16 in the banner).
- Noticed, not changed: `@MockBean` in `ArgumentOptionsControllerTest` is deprecated for removal (replace with `@MockitoBean` before any Boot 4 move).

### 2026-11-14 18:10 UTC: Playwright browser setup
- No Playwright browsers were installed in the container. `npx playwright install chromium` downloaded Chromium, but it failed to launch (`libatk-1.0.so.0` missing). Installed the OS libraries with `sudo npx playwright install-deps chromium` (apt, inside the devcontainer only; lost on rebuild).
- **The original Playwright 1.56.1 can't install a browser on this OS at all** ("Playwright does not support chromium on ubuntu26.04-arm64"). So before the upgrade, E2E could not run in this container. 1.65.1 supports it.
- `scripts/test-e2e.sh`: before running tests it now checks that Chromium launches, and if not runs `npx playwright install --with-deps chromium`. A fresh container therefore self-heals.

### 2026-11-14 18:15 UTC: First full verify run (with E2E)
- All checks PASS except `test-e2e.sh all`: **5 of 5 failed**. The first failure in each was `page.goto: Page crashed` (Chromium), with knock-on timeouts after it. Two workers were running the two spec files in parallel on a container with about 1.8 GB of free memory.

### 2026-11-14 18:20–18:35 UTC: E2E investigation (upgrade vs environment)
- With one worker: `test-rule-versioning.spec.js` **passed**. `test-condition-naming.spec.js` 3/4, with **Scenario 3** failing (the rule saved in `beforeEach` shows "No data" in the rule picker). It then failed 2 more times on its own.
- To rule out the upgrade, I checked out the original commit (`284c52c`) in a temporary git worktree, ran the original backend (Boot 3.2.0) and original frontend (vite 5), and drove them with the new Playwright (spec files unchanged):
  - original backend + original frontend: Scenario 3 **✓ ✓**
  - original backend + **upgraded frontend**: **✓**, so vite 8 isn't the cause
  - original backend with a copy of the main tree's rule files (74 rules): **✓**
- On the failing upgraded-backend run, the CONDITION and CONDGRP rules were written but the **TRANSFORM rule was never POSTed**. The test still logged "saved" because its check (`.ant-message-success`) matched the still-visible toast from the previous save.
- Ran both backends side by side (:8081 original, :8080 upgraded): `POST /api/v1/rules` and `GET /rules/{uuid}/versions` are **identical** (status, headers, body keys, about 2 ms). No DevTools restarts in the logs.
- Controlled A/B with no other servers running and the same rule data: original ✓✓✓, upgraded ✓✓✓, upgraded with tracing off ✓✓✓.
- **Conclusion: not an upgrade regression.** The failures happened under resource pressure (at that point a second stray vite process and extra Maven/Chromium processes were running). The test is sensitive to timing: it uses fixed `waitForTimeout`s, and its "saved" check can match a stale toast.
- Fix: `frontend/playwright.config.js` `workers: 1` (was `CI ? 1 : undefined`). The specs are written to run sequentially (`fullyParallel: false`, "Sequential Scenarios") and share one backend and rules folder.
- Noticed, not changed (test code):
  - `test-condition-naming.spec.js` `beforeEach` waits for *any* success toast after each save, so a missed save goes unnoticed. It should wait for the POST response or for the toast to change.
  - E2E runs leave `TEST_*` rule files behind (`scripts/test-clean.sh` removes them).
- Temporary worktree removed (`git worktree remove`). All servers stopped before the final run.

### 2026-11-14 18:40 UTC: Second full verify, E2E race fixed
- Full verify: everything PASS except E2E **3/5** (Scenarios 2 and 4 failed this time; both passed before), with the same symptom. **The third `beforeEach` save (TRANSFORM) was never POSTed**, and later steps couldn't find the rule. Also found a **vite process still running** after verify finished.
- A standalone probe (scratch script, repeats the `beforeEach` 5 times, waits 1.5s after each Save): **15/15 saves POSTed**.
- Root cause (test race): `handleSaveRule` (`useRuleBuilder.js`) returns early with a warning toast in some cases. The spec waited only for *any* `.ant-message-success`, which the previous save's toast still satisfied, and then went straight to `page.reload()`. So a save that hadn't happened (or hadn't finished) went unnoticed.
- Fix in `frontend/e2e/test-condition-naming.spec.js`: new helper `saveNewRule(page)` clicks Save and waits for **that save's own `POST /api/v1/rules` response** (it must be 201). Used for all three saves in `beforeEach`.
- `npx playwright test e2e/test-condition-naming.spec.js`, run twice: **✓✓✓✓ and ✓✓✓✓**.
- Fixed a vite leak in `scripts/test-e2e.sh` cleanup. It killed only the `npm run dev` / `mvn` wrapper PID, so vite and java children survived. The servers now start under `setsid` and cleanup kills the whole process group. (The original script had the same bug.)

### 2026-11-14 18:55 UTC: Final verification, done
- `scripts/verify.sh` (full, with E2E and audit) from a clean state, **exit 0**:
  ```
  PASS  install.sh
  PASS  jar contains freshly built frontend
  PASS  test.sh (under a TTY)
  PASS  start-backend.sh
  PASS  start-frontend.sh
  PASS  test-e2e.sh all          (5 passed, 2.7m)
  PASS  npm audit (frontend)     (0 vulnerabilities)
  ```
  Unit tests in that run: backend **108/108**, frontend **185/185**. Ports 8080/3003 free afterwards (no leaked servers).
- Cleanup: deleted the 114 `TEST_*` rule files that today's E2E/probe runs created (gitignored), leaving the 41 that were there before. Removed `frontend/test-results`, `frontend/playwright-report` and the temporary baseline worktree.
- README updated: script list (removed non-existent `test-integration.sh` / `test-sql-api.sh`, added `test-clean.sh` / `verify.sh`), `test-e2e.sh` usage, `test:run`, Node 20.19+, Spring Boot 3.5, Vite 8.
- **Working-tree side effect:** `install.sh` rebuilt the tracked UI bundle in `backend/src/main/resources/static/app/` (new hashed asset names), which now shows as modified/deleted in git. Commit it along with the dependency changes, or `git checkout` it.
- Commit status: **nothing committed** (on `main`, all changes uncommitted).
- Follow-up candidates (not done):
  - json-schema-validator 1.0.87 → 1.5.x/2.x (changes user-facing validation messages)
  - remove the 4 pom security overrides when Boot catches up
  - `@MockBean` → `@MockitoBean`
  - consider Boot 4 for the 2 spring-webmvc advisories (not applicable today)
  - stop tracking `static/app/` build output in git
