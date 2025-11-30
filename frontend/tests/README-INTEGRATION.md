# Integration Tests

This directory contains integration tests that require the backend to be running.

## ⚠️ Current Limitation

The integration test (`rule-versioning-integration.test.jsx`) currently **cannot run with Vitest/jsdom** because:
- jsdom doesn't support full browser networking
- Services use relative URLs (`/api/...`) which jsdom tries to fetch from localhost:3000
- The test requires actual HTTP calls to the backend on localhost:8080

### Recommended Solutions

1. **Use Playwright or Cypress** (Recommended for true E2E testing)
   - These tools run tests in a real browser
   - Full network support
   - Better UI interaction testing
   
2. **Create a mocked version** for unit/integration hybrid tests
   - Mock the backend responses
   - Test UI logic without real backend
   - Faster but less comprehensive

3. **Use MSW (Mock Service Worker)** for API mocking in tests
   - Intercepts network requests
   - Can work in jsdom environment
   - Provides realistic API mocking

## Rule Versioning Integration Test

**File:** `rule-versioning-integration.test.jsx`

**Status:** ⚠️ Requires Playwright/Cypress to run properly

Tests the complete rule versioning workflow including:
- Creating a new rule (version 1)
- Modifying and saving (version 2)
- Viewing different versions
- Restoring a previous version (creates version 3)
- Verifying all versions maintain their data correctly

### Running the Test

**Important:** The Vitest version (`rule-versioning-integration.test.jsx`) will not work due to jsdom limitations.

**Use the Playwright E2E test instead:**

#### Setup (One-time)

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

#### Running the E2E Test

1. **Start the backend:**
   ```bash
   ./scripts/start-backend.sh
   # Backend will run on http://localhost:8080
   ```

2. **Start the frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   # Frontend will run on http://localhost:5173
   ```

3. **Run Playwright E2E tests:**
   ```bash
   cd frontend
   npx playwright test e2e/rule-versioning.spec.js
   
   # Or run in headed mode to watch:
   npx playwright test e2e/rule-versioning.spec.js --headed
   
   # Or run in UI mode for debugging:
   npx playwright test e2e/rule-versioning.spec.js --ui
   ```

4. **Stop servers** when done (Ctrl+C in each terminal)

### Prerequisites

- Backend JAR must be built: `cd backend && mvn clean package`
- Backend must be accessible at `http://localhost:8080`
- Frontend dependencies installed: `cd frontend && npm install`

### Test Coverage

The test covers the following scenario:

1. **Create Rule v1**
   - Set rule name to "TEST_RULE_1"
   - Set condition group name to "Condition v1"
   - Set condition: `NUMBER_FIELD_01 = NUMBER_FIELD_02`
   - Save rule
   - Verify version 1 appears in Rule History

2. **Load and Modify to v2**
   - Load TEST_RULE_1 from Rule Search
   - Verify version 1 is in Rule History
   - Change condition group name to "Condition v2"
   - Save rule
   - Verify version 2 appears in Rule History

3. **Clear and Reload**
   - Clear Rule Search
   - Load TEST_RULE_1 again
   - Verify both version 1 and version 2 are present
   - Verify rule displays "Condition v2"
   - Verify JSON editor shows "Condition v2"

4. **View Version 1**
   - Click "View" on version 1 in Rule History
   - Verify rule displays "Condition v1"
   - Verify JSON editor shows "Condition v1"

5. **View Version 2**
   - Click "View" on version 2 in Rule History
   - Verify rule displays "Condition v2"
   - Verify JSON editor shows "Condition v2"

6. **Restore Version 1 (creates v3)**
   - Click "Restore" on version 1
   - Confirm restoration
   - Verify version 3 is created
   - Verify all three versions are present
   - Verify rule displays "Condition v1"
   - Verify JSON editor shows "Condition v1"

7. **Verify Version 2 Unchanged**
   - Click "View" on version 2
   - Verify rule still displays "Condition v2"
   - Verify JSON editor shows "Condition v2"

8. **Verify Version 3 Matches Version 1**
   - Click "View" on version 3
   - Verify rule displays "Condition v1" (same as v1)
   - Verify JSON editor shows "Condition v1"

### Notes

- This test creates actual data in the backend
- The test uses a specific rule name "TEST_RULE_1" that should be unique
- Consider adding cleanup endpoints to the backend for test isolation
- Timeouts are set generously to account for network delays and rendering

### Troubleshooting

**Backend not responding:**
- Verify backend is running: `curl http://localhost:8080/api/config`
- Check backend logs for errors
- Ensure port 8080 is not in use by another process

**Tests timing out:**
- Backend may be slow to start - increase timeout in test
- Network delays - run backend and tests on same machine

**Tests failing on selectors:**
- UI components may have changed
- Check that component structure matches test expectations
- Use `screen.debug()` in test to inspect rendered output
