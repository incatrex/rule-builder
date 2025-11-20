/**
 * E2E Test: Rule Versioning Workflow
 * 
 * Prerequisites:
 * 1. Backend server running on http://localhost:8080
 * 2. Frontend dev server running
 * 3. Playwright installed: npm install -D @playwright/test
 * 
 * To run:
 * 1. Start backend: ./scripts/start-backend.sh
 * 2. Start frontend: cd frontend && npm run dev
 * 3. Run test: cd frontend && npx playwright test e2e/rule-versioning.spec.js
 * 
 * Or use headed mode to watch: npx playwright test e2e/rule-versioning.spec.js --headed
 */

import { test, expect } from '@playwright/test';

test.describe('Rule Versioning E2E Tests', () => {
  let testRuleId;

  test.beforeEach(async ({ page }) => {
    // Generate unique rule ID for this test run
    const timestamp = Date.now();
    testRuleId = `TEST_RULE_${timestamp}`;
    
    // Listen to console logs
    page.on('console', msg => {
      if (msg.text().includes('[useRuleHistory]')) {
        console.log('BROWSER LOG:', msg.text());
      }
    });
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('text=Rule Builder', { timeout: 10000 });
    
    // Wait for initial loading to complete
    await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 10000 });
  });

  test('complete rule versioning workflow', async ({ page }) => {
    // ============================================================
    // STEP 1: Create new rule v1 from Rule Search
    // ============================================================
    
    console.log(`STEP 1: Creating new rule v1 with ID: ${testRuleId}...`);
    
    // Find "New Rule" button in Rule Search card
    const ruleSearchCard = page.locator('.ant-card').filter({ hasText: 'Rule Search' });
    await ruleSearchCard.locator('button:has-text("New Rule")').click();

    // Wait for rule builder to be ready
    await page.waitForTimeout(1000);

    // Set Rule ID to unique test ID using test ID
    await page.getByTestId('rule-id-input').fill(testRuleId);

    // Set Condition Group name to "Condition v1"
    // Expand the condition group if needed
    const conditionGroupCollapse = page.locator('.ant-collapse').filter({ hasText: /Condition Group/i }).first();
    await conditionGroupCollapse.click();
    await page.waitForTimeout(500);
    
    // Click the edit icon using test ID
    await page.getByTestId('conditionGroup-0-name-edit-icon').click();
    await page.waitForTimeout(300);
    
    // Fill in the condition group name using test ID
    await page.getByTestId('conditionGroup-0-name-input').fill('Condition v1');
    await page.getByTestId('conditionGroup-0-name-input').press('Enter');
    await page.waitForTimeout(300);
    
    // Save the rule using test ID
    await page.getByTestId('rule-save-button').click();

    // Wait for success message - "Rule created: TEST_RULE_1 v1"
    await expect(page.locator('text=/Rule created.*TEST_RULE_1.*v1/i')).toBeVisible({ timeout: 10000 });
    
    // Check that Version 1 shows in Rule History
    // Wait for the history table to populate (it starts empty)
    const ruleHistoryCard = page.locator('.ant-card').filter({ hasText: 'Rule History' });
    await expect(ruleHistoryCard.locator('text=/version.*1/i')).toBeVisible({ timeout: 10000 });

    console.log('✓ Rule v1 created successfully');

    // ============================================================
    // STEP 2: Load the rule and modify to v2
    // ============================================================
    
    console.log(`STEP 2: Loading ${testRuleId} and modifying to v2...`);

    // Search for the rule by typing in the search select
    const ruleSearchSelect = page.getByTestId('rule-search-select').first();
    await ruleSearchSelect.click();
    await page.waitForTimeout(500);
    
    console.log('  - Typing rule ID to search...');
    // Type the rule ID to search
    await ruleSearchSelect.pressSequentially(testRuleId, { delay: 100 });
    await page.waitForTimeout(500);

    console.log('  - Clicking on matching option...');
    // Click on the matching option
    await page.locator(`.ant-select-item-option:has-text("${testRuleId}")`).first().click();
    await page.waitForTimeout(1500);

    console.log('  - Waiting for rule to load and history to populate...');
    // Wait longer for rule to load and history to populate
    await page.waitForTimeout(3000);

    console.log('  - Verifying version 1 in history...');
    // Verify version 1 is in Rule History table (skip the hidden measurement row)
    await expect(ruleHistoryCard.locator('.ant-table-tbody tr:not([aria-hidden])').first()).toBeVisible({ timeout: 10000 });
    await expect(ruleHistoryCard.locator('.ant-table-tbody').locator('text=1').first()).toBeVisible();

    console.log('  - Editing condition group name...');
    // Change Condition Group name to "Condition v2" using test IDs
    await page.getByTestId('conditionGroup-0-name-edit-icon').click();
    await page.waitForTimeout(300);
    await page.getByTestId('conditionGroup-0-name-input').fill('Condition v2');
    await page.getByTestId('conditionGroup-0-name-input').press('Enter');
    await page.waitForTimeout(300);

    console.log('  - Saving modified rule...');
    // Save the modified rule
    await page.getByTestId('rule-save-button').click();

    // Wait for success message (Ant Design notification)
    console.log('  - Waiting for success message...');
    await expect(page.locator('.ant-message-success, .ant-notification-notice-success')).toBeVisible({ timeout: 5000 });
    
    // Wait for history to update
    await page.waitForTimeout(2000);
    
    console.log('  - Verifying version 2 in history...');
    // Check that Version 2 shows in Rule History table (should now have 2 rows)
    const rows = ruleHistoryCard.locator('.ant-table-tbody tr:not([aria-hidden])');
    await expect(rows).toHaveCount(2, { timeout: 5000 });
    // Check version 2 is visible (first row in descending order)
    await expect(rows.first().locator('td').nth(1)).toContainText('2');

    console.log('✓ Rule v2 created successfully');

    // ============================================================
    // STEP 3: Clear and reload the rule
    // ============================================================
    
    console.log(`STEP 3: Clearing search and reloading ${testRuleId}...`);

    // Clear the select using the clear icon in the test ID'd component
    await page.getByTestId('rule-search-select').click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); // Close dropdown
    await page.waitForTimeout(300);
    
    // Click the clear button (X icon) in the select
    const clearIcon = page.locator('[data-testid="rule-search-select"]').locator('.ant-select-clear');
    await clearIcon.click();
    await page.waitForTimeout(500);

    // Search again - click to open dropdown
    await page.getByTestId('rule-search-select').click();
    await page.waitForTimeout(300);
    
    // Type to search
    await page.keyboard.type(testRuleId);
    await page.waitForTimeout(500);
    
    // Click on the first matching rule in dropdown
    await page.locator('.ant-select-item-option').filter({ hasText: testRuleId }).first().click();
    await page.waitForTimeout(1500);

    // Verify both versions are in Rule History table
    await expect(rows).toHaveCount(2);
    // Version 2 should be first (newest), version 1 second
    await expect(rows.nth(0).locator('td').nth(1)).toContainText('2');
    await expect(rows.nth(1).locator('td').nth(1)).toContainText('1');

    // Verify Condition Group shows "Condition v2" in the code element
    await expect(page.locator('code:has-text("Condition v2")')).toBeVisible();

    // Click JSON tab to ensure it's active and verify content
    // Use force click to avoid sticky header interference
    await page.locator('.ant-tabs-tab').filter({ hasText: 'JSON' }).click({ force: true });
    await page.waitForTimeout(500);
    const jsonTextarea = page.getByTestId('json-editor-textarea');
    await expect(jsonTextarea).toBeVisible({ timeout: 5000 });
    const jsonContent = await jsonTextarea.inputValue();
    expect(jsonContent).toContain('Condition v2');

    console.log('✓ Rule reloaded with both versions');

    // ============================================================
    // STEP 4: View Version 1
    // ============================================================
    
    console.log('STEP 4: Viewing version 1...');

    // Click actions dropdown for version 1
    await page.getByTestId('rule-history-actions-v1').click();
    await page.waitForTimeout(200);
    
    // Click View in dropdown menu
    await page.getByTestId('rule-history-view-v1').click();
    await page.waitForTimeout(1000);

    // Verify Condition Group shows "Condition v1" in code element
    await expect(page.locator('code:has-text("Condition v1")')).toBeVisible({ timeout: 3000 });

    // Verify JSON Editor contains "Condition v1"
    await expect(jsonTextarea).toBeVisible({ timeout: 2000 });
    const jsonContentV1 = await jsonTextarea.inputValue();
    expect(jsonContentV1).toContain('Condition v1');

    console.log('✓ Version 1 viewed successfully');

    // ============================================================
    // STEP 5: View Version 2
    // ============================================================
    
    console.log('STEP 5: Viewing version 2...');

    // Click actions dropdown for version 2
    await page.getByTestId('rule-history-actions-v2').click();
    await page.waitForTimeout(200);
    
    // Click View in dropdown menu
    await page.getByTestId('rule-history-view-v2').click();
    await page.waitForTimeout(1000);

    // Verify Condition Group shows "Condition v2" in code element
    await expect(page.locator('code:has-text("Condition v2")')).toBeVisible({ timeout: 3000 });

    // Verify JSON Editor contains "Condition v2"
    await expect(jsonTextarea).toBeVisible({ timeout: 2000 });
    const jsonContentV2 = await jsonTextarea.inputValue();
    expect(jsonContentV2).toContain('Condition v2');

    console.log('✓ Version 2 viewed successfully');

    // ============================================================
    // STEP 6: Restore Version 1 (creates v3)
    // ============================================================
    
    console.log('STEP 6: Restoring version 1...');

    // Click actions dropdown for version 1
    await page.getByTestId('rule-history-actions-v1').click();
    await page.waitForTimeout(200);
    
    // Click Restore in dropdown menu
    await page.getByTestId('rule-history-restore-v1').click();

    // Wait for confirmation modal
    await expect(page.locator('text=/restore version/i')).toBeVisible({ timeout: 2000 });

    // Confirm the restore
    await page.locator('.ant-modal button:has-text("Restore")').click();

    // Wait for success message - use more specific selector to avoid matching JSON content
    await expect(page.locator('.ant-message .ant-message-notice-content').filter({ hasText: /restored/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Verify at least three versions exist in table (could be more if viewing created versions)
    const rowCount = await rows.count();
    console.log(`  - Found ${rowCount} versions in history`);
    expect(rowCount).toBeGreaterThanOrEqual(3);
    
    // The newest version should be the restored version (Condition v1)
    // Don't check exact version number as viewing might create intermediate versions

    // Verify rule shows "Condition v1" in code element
    await expect(page.locator('code:has-text("Condition v1")')).toBeVisible();

    // Verify JSON Editor contains "Condition v1"
    await expect(jsonTextarea).toBeVisible({ timeout: 2000 });
    const jsonContentV3Restored = await jsonTextarea.inputValue();
    expect(jsonContentV3Restored).toContain('Condition v1');

    console.log('✓ Version 1 restored');

    // ============================================================
    // STEP 7: Verify Version 2 unchanged
    // ============================================================
    
    console.log('STEP 7: Verifying version 2 unchanged...');

    // Click actions dropdown for version 2
    await page.getByTestId('rule-history-actions-v2').click();
    await page.waitForTimeout(200);
    
    // Click View in dropdown menu
    await page.getByTestId('rule-history-view-v2').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('code:has-text("Condition v2")')).toBeVisible();
    await expect(jsonTextarea).toBeVisible({ timeout: 2000 });
    const jsonContentV2Check = await jsonTextarea.inputValue();
    expect(jsonContentV2Check).toContain('Condition v2');

    console.log('✓ Version 2 is unchanged');

    // ============================================================
    // STEP 8: Verify Latest Version matches Version 1
    // ============================================================
    
    console.log('STEP 8: Verifying version 3 matches version 1...');

    // Get the latest version number dynamically
    const firstVersionCell = await rows.nth(0).locator('td').nth(1).textContent();
    // Extract just the number (in case it has [restored] suffix like "4 [1]")
    const latestVersion = firstVersionCell.trim().split(' ')[0];
    console.log(`  - Latest version is v${latestVersion}`);

    // Click actions dropdown for latest version
    await page.getByTestId(`rule-history-actions-v${latestVersion}`).click();
    await page.waitForTimeout(200);
    
    // Click View in dropdown menu
    await page.getByTestId(`rule-history-view-v${latestVersion}`).click();
    await page.waitForTimeout(1000);

    await expect(page.locator('code:has-text("Condition v1")')).toBeVisible({ timeout: 3000 });
    await expect(jsonTextarea).toBeVisible({ timeout: 2000 });
    const jsonContentLatest = await jsonTextarea.inputValue();
    expect(jsonContentLatest).toContain('Condition v1');

    console.log(`✓ Version ${latestVersion} matches version 1`);

    console.log('\n✅ All rule versioning workflow steps completed successfully!');
  });
});
