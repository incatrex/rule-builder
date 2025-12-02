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
    testRuleId = `TEST_VERSIONING_${timestamp}`;
    
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
    
    // Click "New Rule" button in Rule Search card
    await page.getByTestId('new-rule-button').click();

    // Wait for rule builder to be ready
    await page.waitForTimeout(1000);

    // Set Rule ID to unique test ID using test ID
    await page.getByTestId('rule-id-input').fill(testRuleId);

    // Default structure is now a simple Condition (no longer ConditionGroup by default)
    // We'll work with the Condition instead of converting to ConditionGroup
    // Wait for the condition collapse to be ready
    await page.waitForTimeout(1000);
    
    // Expand the condition collapse to see its content
    const conditionCollapse = page.getByTestId('condition-header-condition');
    await conditionCollapse.click();
    await page.waitForTimeout(500);
    
    // Edit the condition name to "Condition v1"
    // Look for the name edit icon
    const editIcon = page.getByTestId('condition-edit-icon');
    await editIcon.click();
    await page.waitForTimeout(300);
    
    // Fill in the condition name
    const nameInput = page.getByTestId('condition-name-input');
    await nameInput.fill('Condition v1');
    await nameInput.press('Enter');
    await page.waitForTimeout(300);
    
    // Save the rule using test ID
    await page.getByTestId('rule-save-button').click();

    // Wait for success message - "Rule created: TEST_VERSIONING_1 v1"
    await expect(page.locator('text=/Rule created.*TEST_VERSIONING_1.*v1/i')).toBeVisible({ timeout: 10000 });
    
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

    console.log('  - Editing condition name...');
    // Change Condition name to "Condition v2"
    // Click the edit icon
    const editIcon2 = page.getByTestId('condition-edit-icon');
    await editIcon2.click();
    await page.waitForTimeout(300);
    const nameInput2 = page.getByTestId('condition-name-input');
    await nameInput2.fill('Condition v2');
    await nameInput2.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify the name change is reflected in the UI
    await expect(page.locator('code:has-text("Condition v2")')).toBeVisible({ timeout: 3000 });
    console.log('  - Condition name changed to "Condition v2" confirmed in UI');

    console.log('  - Saving modified rule...');
    // Save the modified rule
    await page.getByTestId('rule-save-button').click();

    // Wait for success message (Ant Design notification)
    console.log('  - Waiting for success message...');
    await expect(page.locator('.ant-message-success, .ant-notification-notice-success')).toBeVisible({ timeout: 5000 });
    
    // Wait for history table to update (polling approach)
    console.log('  - Waiting for version 2 to appear in history table...');
    const ruleHistoryCard2 = page.locator('.ant-card').filter({ hasText: 'Rule History' });
    const rows = ruleHistoryCard2.locator('.ant-table-tbody tr:not([aria-hidden])');
    
    // Wait up to 10 seconds for 2 rows to appear
    await expect(rows).toHaveCount(2, { timeout: 10000 });
    
    console.log('  - Verifying version 2 in history...');
    const actualRowCount = await rows.count();
    console.log(`  - Found ${actualRowCount} version(s) in history table`);
    
    // Debug: Log what versions are showing
    for (let i = 0; i < actualRowCount; i++) {
      const versionText = await rows.nth(i).locator('td').nth(1).textContent();
      console.log(`    Row ${i}: Version ${versionText}`);
    }
    // Check version 2 is visible (first row in descending order)
    await expect(rows.first().locator('td').nth(1)).toContainText('2');

    console.log('✓ Rule v2 created successfully');

    // ============================================================
    // STEP 3: Verify both versions in history (skip reload, already have current state)
    // ============================================================
    
    console.log('STEP 3: Verifying both versions in history...');

    // Verify both versions are in Rule History table
    await expect(rows).toHaveCount(2);
    // Version 2 should be first (newest), version 1 second
    await expect(rows.nth(0).locator('td').nth(1)).toContainText('2');
    await expect(rows.nth(1).locator('td').nth(1)).toContainText('1');

    // Verify Condition shows "Condition v2" in the code element
    await expect(page.locator('code:has-text("Condition v2")')).toBeVisible();

    console.log('✓ Both versions verified');

    // ============================================================
    // STEP 4: View Version 1
    // ============================================================
    
    console.log('STEP 4: Viewing version 1...');

    // Get reference to JSON textarea (needed for later steps)
    const jsonTextarea = page.getByTestId('json-editor-textarea');

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

    // Verify 3 versions exist in table (v1, v2, v3 restored)
    await expect(rows).toHaveCount(3, { timeout: 5000 });
    
    // The newest version should be the restored version containing "Condition v1"
    const newestVersionText = await rows.nth(0).locator('td').nth(1).textContent();

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

    // Click actions dropdown for version 3
    await page.getByTestId('rule-history-actions-v3').click();
    await page.waitForTimeout(200);
    
    // Click View in dropdown menu
    await page.getByTestId('rule-history-view-v3').click();
    await page.waitForTimeout(1000);

    await expect(page.locator('code:has-text("Condition v1")')).toBeVisible({ timeout: 3000 });
    await expect(jsonTextarea).toBeVisible({ timeout: 2000 });
    const jsonContentLatest = await jsonTextarea.inputValue();
    expect(jsonContentLatest).toContain('Condition v1');

    console.log('✓ Version 3 matches version 1');

    console.log('\n✅ All rule versioning workflow steps completed successfully!');
  });
});
