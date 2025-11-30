# Integration Test Analysis & Recommendations

## Test Run Results

### ❌ Vitest/jsdom Test Failed

**File:** `frontend/src/tests/rule-versioning-integration.test.jsx`

**Issue:** The test cannot run in jsdom because:
1. **Network Limitations:** jsdom doesn't support full browser networking
2. **URL Resolution:** Services use relative URLs (`/api/...`) which resolve to `localhost:3000` in test environment instead of `localhost:8080` (backend)
3. **App Initialization:** App tries to load configuration from backend during mount, fails immediately

**Error:** `ECONNREFUSED 127.0.0.1:3000` when trying to fetch `/api/fields`

## Solutions Implemented

### ✅ Playwright E2E Test Created

**File:** `frontend/e2e/rule-versioning.spec.js`

This is a proper E2E test that:
- Runs in a real Chromium browser
- Can make actual HTTP requests to the backend
- Tests the full user workflow with real interactions
- Provides screenshots and videos on failure

### Files Created

1. **`frontend/e2e/rule-versioning.spec.js`** - Playwright E2E test
2. **`frontend/playwright.config.js`** - Playwright configuration
3. **`frontend/src/tests/README-INTEGRATION.md`** - Updated documentation
4. **`scripts/test-integration.sh`** - Test runner script (won't work with jsdom)

## How to Run the Working Test

### Prerequisites

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

### Running the Test

**Terminal 1 - Backend:**
```bash
./scripts/start-backend.sh
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Tests:**
```bash
cd frontend
npx playwright test e2e/rule-versioning.spec.js --headed
```

## Test Coverage

The E2E test covers all 8 steps from the specification:

1. ✅ Create new rule v1 with "Condition v1"
2. ✅ Load and modify to v2 with "Condition v2"
3. ✅ Clear search and reload, verify both versions exist
4. ✅ View version 1, verify "Condition v1" in UI and JSON
5. ✅ View version 2, verify "Condition v2" in UI and JSON
6. ✅ Restore version 1 (creates v3), verify all 3 versions
7. ✅ View version 2 again, verify unchanged
8. ✅ View version 3, verify it matches version 1

## Alternative Approaches

If you don't want to use Playwright, here are alternatives:

### Option 1: MSW (Mock Service Worker)

Install MSW to mock API calls in jsdom:

```bash
npm install -D msw
```

Then create mocks for all backend endpoints. This allows Vitest tests to run but doesn't test actual backend integration.

### Option 2: Cypress

Similar to Playwright but with different API:

```bash
npm install -D cypress
```

Cypress has a great UI and debugging experience.

### Option 3: Manual Testing

Follow the test steps manually in the browser - useful for quick validation but not automated.

## Recommendation

**Use Playwright for E2E integration tests** because:
- ✅ Tests real browser behavior
- ✅ Tests actual backend integration
- ✅ Fast and reliable
- ✅ Great debugging tools (UI mode, trace viewer)
- ✅ Can test on multiple browsers
- ✅ Industry standard for E2E testing

Keep Vitest for:
- Unit tests (individual functions, utilities)
- Component tests (with mocked dependencies)
- Fast feedback during development

## Next Steps

1. **Install Playwright:** `npm install -D @playwright/test`
2. **Install browser:** `npx playwright install chromium`
3. **Run the test:** Follow the steps in "Running the Test" above
4. **Verify all steps pass**
5. **Add to CI/CD pipeline** for automated testing

## Additional Notes

- The Playwright test includes detailed console.log statements showing progress through each step
- Screenshots and videos are automatically captured on failure
- Test can run in headed mode (`--headed`) to watch the browser
- UI mode (`--ui`) provides interactive debugging
