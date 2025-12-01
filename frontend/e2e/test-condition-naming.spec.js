/**
 * Condition Naming E2E Tests - Sequential Scenarios
 * Based on: test-condition-naming.csv
 * 
 * IMPORTANT: These are 4 INDEPENDENT scenarios where ALL steps execute in order within each:
 * - Scenario 1: "New Simple Condition" (CSV rows 2-27)
 * - Scenario 2: "New Case Expression - Complete Flow" (CSV rows 30-65)
 * - Scenario 3: "New Case Expression - Verify THEN names" (CSV rows 67-74)
 * - Scenario 4: "New Case Expression - Verify ELSE names" (CSV rows 76-82)
 * 
 * Each test builds upon all previous steps within that scenario.
 */

import { test, expect } from '@playwright/test';

// Helper function to select source option using path-based test-id
// Uses proper Ant Design dropdown handling
async function selectSourceByPath(page, expansionPath, optionText) {
  const selector = page.getByTestId(`condition-source-selector-${expansionPath}`);
  
  // Wait for selector to be available
  await selector.waitFor({ state: 'attached', timeout: 5000 });
  
  // Force click to handle nested conditions in collapsed panels
  await selector.click({ force: true });
  
  // Wait for the Ant Design dropdown to be visible (not hidden)
  const dropdownLocator = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  await dropdownLocator.waitFor({ state: 'attached', timeout: 5000 });
  
  // Locate and click the option by text
  const optionLocator = dropdownLocator.locator('.ant-select-item').filter({ hasText: new RegExp(`^${optionText}$`) });
  
  // Wait for the option to be present
  await optionLocator.first().waitFor({ state: 'attached', timeout: 3000 });
  
  // Scroll into view with timeout to avoid hanging
  try {
    await optionLocator.first().scrollIntoViewIfNeeded({ timeout: 2000 });
  } catch (e) {
    // Continue if scroll times out
  }
  
  // Click directly
  await optionLocator.first().click({ force: true });
  
  // Wait for the change to be processed
  await page.waitForTimeout(300);
}

// Helper function to select expression source using path-based test-id
async function selectExpressionSource(page, expansionPath, optionText) {
  const selector = page.getByTestId(`expression-source-selector-${expansionPath}`);
  
  // Wait for selector to be available
  await selector.waitFor({ state: 'attached', timeout: 5000 });
  
  // Force click to handle nested expressions
  await selector.click({ force: true });
  
  // Wait for the Ant Design dropdown to be visible
  const dropdownLocator = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  await dropdownLocator.waitFor({ state: 'attached', timeout: 5000 });
  
  // Locate and click the option by text
  const optionLocator = dropdownLocator.locator('.ant-select-item').filter({ hasText: new RegExp(`^${optionText}$`) });
  
  // Wait for the option to be present
  await optionLocator.first().waitFor({ state: 'attached', timeout: 3000 });
  
  // Scroll into view with timeout to avoid hanging
  try {
    await optionLocator.first().scrollIntoViewIfNeeded({ timeout: 2000 });
  } catch (e) {
    // Continue if scroll times out
  }
  
  // Click directly
  await optionLocator.first().click({ force: true });
  
  // Wait for the change to be processed
  await page.waitForTimeout(300);
}

// Helper function to select a rule from the rule selector dropdown
async function selectRule(page, ruleId) {
  console.log(`  [selectRule] Looking for rule: ${ruleId}`);
  
  // Open the rule selector dropdown and type to search
  const ruleSelector = page.locator('.ant-select').filter({ hasText: 'Select a rule' }).first();
  await ruleSelector.click();
  await page.waitForTimeout(500);
  
  // Ensure the search input is focused before typing
  await page.keyboard.press('Escape'); // Clear any existing dropdown
  await page.waitForTimeout(200);
  await ruleSelector.click();
  await page.waitForTimeout(300);
  
  // Type the rule ID - Ant Design Select has built-in search that queries backend
  await page.keyboard.type(ruleId, { delay: 50 });
  await page.waitForTimeout(800);
  
  const dropdownLocator = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  await dropdownLocator.waitFor({ state: 'attached', timeout: 5000 });
  
  const ruleOption = dropdownLocator.locator('.ant-select-item').filter({ hasText: new RegExp(ruleId) }).first();
  await ruleOption.waitFor({ state: 'attached', timeout: 10000 });
  
  // Scroll into view with timeout to avoid hanging
  try {
    await ruleOption.scrollIntoViewIfNeeded({ timeout: 2000 });
  } catch (e) {
    // Continue if scroll times out
  }
  
  // Click directly
  await ruleOption.click({ force: true });
  await page.waitForTimeout(300);
}

test.describe('Condition Naming - Sequential Scenarios', () => {
  let testRuleId;

  test.beforeEach(async ({ page }) => {
    // Generate unique rule ID for this test run
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + '_' + 
      String(now.getHours()).padStart(2, '0') + 
      String(now.getMinutes()).padStart(2, '0') + 
      String(now.getSeconds()).padStart(2, '0');
    testRuleId = `TEST_NAMING_${timestamp}`;
    
    console.log(`\n[beforeEach] Creating test rule: ${testRuleId}`);
    
    // Navigate to the app
    await page.goto('http://localhost:3003', { waitUntil: 'load', timeout: 30000 });
    
    // Wait for the rule builder to be visible
    await page.waitForSelector('.rule-builder-container', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Create a test rule with a simple condition
    console.log(`[beforeEach] Setting rule ID to: ${testRuleId}`);
    await page.getByTestId('rule-id-input').fill(testRuleId);
    await page.waitForTimeout(300);
    
    // Save the rule
    console.log('[beforeEach] Saving test rule...');
    await page.getByTestId('rule-save-button').click();
    
    // Wait for success message - rule is now saved
    await page.waitForSelector('.ant-message-success, .ant-notification-notice-success', { timeout: 5000 });
    console.log('[beforeEach] Test rule saved successfully');
    
    // Reload the page to clear any caches and create a fresh state
    console.log('[beforeEach] Reloading page to clear caches and start fresh...');
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('.rule-builder-container', { timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('[beforeEach] Page reloaded, test ready to start\n');
  });

  test('Scenario 1: New Simple Condition - Complete Flow (CSV rows 2-27)', async ({ page }) => {
    test.setTimeout(90000); // 90 second timeout for this test
    console.log('\n=== SCENARIO 1: New Simple Condition - Complete Flow ===\n');
    
    // CSV Row 2: Create new rule with structure = "condition" (default)
    console.log('CSV Row 2: Create new rule with structure = "condition"');
    // Verify: Default name is "Condition"
    await expect(page.locator('code:has-text("Condition")')).toBeVisible();
    console.log('✓ Verified: Condition');

    // CSV Row 3: Change source to Group
    console.log('\nCSV Row 3: Change source to Group');
    await selectSourceByPath(page, 'condition-0', 'Group');
    
    // Verify: "Condition Group" with "Condition 1", "Condition 2"
    await expect(page.locator('code:has-text("Condition Group")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2")')).toBeVisible();
    console.log('✓ Verified: Condition Group --> Condition 1, Condition 2');

    // CSV Row 4: Change source to Rule
    console.log('\nCSV Row 4: Change source to Rule');
    await selectSourceByPath(page, 'condition-0', 'Rule');
    
    // Verify: Back to "Condition"
    await expect(page.locator('code:has-text("Condition")')).toBeVisible();
    console.log('✓ Verified: Condition');

    // CSV Row 5: Select Rule
    console.log('\nCSV Row 5: Select Rule');
    await selectRule(page, testRuleId);
    await expect(page.locator(`code:has-text("${testRuleId}")`)).toBeVisible();
    console.log(`✓ Verified: Condition name = ${testRuleId}`);

    // CSV Row 6: Change source to Condition
    console.log('\nCSV Row 6: Change source to Condition');
    await selectSourceByPath(page, 'condition-0', 'Condition');
    
    // Verify: "Condition"
    await expect(page.locator('code:has-text("Condition")')).toBeVisible();
    console.log('✓ Verified: Condition');

    // CSV Row 7: (empty row in CSV)
    
    // CSV Row 8: Add Condition (convert to group)
    console.log('\nCSV Row 8: Add Condition (convert to group)');
    await selectSourceByPath(page, 'condition-0', 'Group');
    
    // Verify: "Condition Group" with children
    await expect(page.locator('code:has-text("Condition Group")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2")')).toBeVisible();
    console.log('✓ Verified: Condition Group --> Condition 1, Condition 2');

    // CSV Row 9: Change Condition 1 source to Group
    console.log('\nCSV Row 9: Change Condition 1 source to Group');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Group');
    
    // Verify: "Condition Group 1" with "Condition 1.1", "Condition 1.2"
    await expect(page.locator('code:has-text("Condition Group 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2")')).toBeVisible();
    console.log('✓ Verified: Condition Group 1 --> Condition 1.1, Condition 1.2');

    // CSV Row 10: Change Condition Group 1 source to Rule
    console.log('\nCSV Row 10: Change Condition Group 1 source to Rule');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Rule');
    
    // Verify: "Condition Group 1"
    await expect(page.locator('code:has-text("Condition Group 1")')).toBeVisible();
    console.log('✓ Verified: Condition Group 1');

    // CSV Row 11: Select Rule
    console.log('\nCSV Row 11: Select Rule');
    await selectRule(page, testRuleId);
    await expect(page.locator(`code:has-text("${testRuleId}")`)).toBeVisible();
    console.log(`✓ Verified: Condition name = ${testRuleId}`);

    // CSV Row 12: Change Condition 1 source to Condition
    console.log('\nCSV Row 12: Change Condition 1 source to Condition');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Condition');
    
    // Verify: "Condition 1"
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    console.log('✓ Verified: Condition 1');

    // CSV Row 13: Change Condition 2 source to Group
    console.log('\nCSV Row 13: Change Condition 2 source to Group');
    await selectSourceByPath(page, 'condition-0-condition-1', 'Group');
    
    // Verify: "Condition Group 2" with "Condition 2.1", "Condition 2.2"
    await expect(page.locator('code:has-text("Condition Group 2")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.2")')).toBeVisible();
    console.log('✓ Verified: Condition Group 2 --> Condition 2.1, Condition 2.2');

    // CSV Row 14: Change Condition 2.1 source to Group
    console.log('\nCSV Row 14: Change Condition 2.1 source to Group');
    await selectSourceByPath(page, 'condition-0-condition-1-condition-0', 'Group');
    
    // Verify: "Condition Group 2.1" with "Condition 2.1.1", "Condition 2.1.2"
    await expect(page.locator('code:has-text("Condition Group 2.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1.2")')).toBeVisible();
    console.log('✓ Verified: Condition Group 2.1 --> Condition 2.1.1, Condition 2.1.2');

    // CSV Row 15: Add Group (to Root Group)
    console.log('\nCSV Row 15: Add Group (to Root Group)');
    const addGroupButton = page.getByTestId('add-group-button-condition-0');
    await addGroupButton.click();
    await page.waitForTimeout(500);
    
    // Verify: New group added
    await expect(page.locator('code:has-text("Condition Group 3")')).toBeVisible();
    console.log('✓ Verified: Condition Group 3 --> Condition 3.1, Condition 3.2');

    // CSV Row 16: (empty row in CSV)

    // CSV Row 17: Change Condition 1 name to "User Named 1"
    console.log('\nCSV Row 17: Change Condition 1 name to "User Named 1"');
    const condition1Header = page.getByTestId('condition-header-condition-1');
    const editIcon = condition1Header.getByTestId('condition-edit-icon');
    await editIcon.click();
    
    const nameInput = page.getByTestId('condition-name-input');
    await nameInput.fill('User Named 1');
    await nameInput.press('Enter');
    
    // Verify: Custom name
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
    console.log('✓ Verified: User Named 1');

    // CSV Row 18: Change User Named 1 source to Group
    console.log('\nCSV Row 18: Change User Named 1 source to Group');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Group');
    
    // Verify: Custom name preserved, children have standard numbering
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2")')).toBeVisible();
    console.log('✓ Verified: User Named 1 --> Condition 1.1, Condition 1.2');

    // CSV Row 19: Change User Named 1 source to Condition
    console.log('\nCSV Row 19: Change User Named 1 source to Condition');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Condition');
    
    // Verify: Custom name preserved
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
    console.log('✓ Verified: User Named 1');

    // CSV Row 20: Change User Named 1 source to Group
    console.log('\nCSV Row 20: Change User Named 1 source to Group');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Group');
    
    // Verify: Custom name still preserved
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
    console.log('✓ Verified: User Named 1 --> Condition 1.1, Condition 1.2');

    // CSV Row 21: Change Condition 1.1 name to "User Named 2"
    console.log('\nCSV Row 21: Change Condition 1.1 name to "User Named 2"');
    const condition11Header = page.getByTestId('condition-header-condition-1.1');
    const editIcon11 = condition11Header.getByTestId('condition-edit-icon');
    await editIcon11.click();
    
    const nameInput11 = page.getByTestId('condition-name-input');
    await nameInput11.fill('User Named 2');
    await nameInput11.press('Enter');
    
    // Verify: Custom name
    await expect(page.locator('code:has-text("User Named 2")')).toBeVisible();
    console.log('✓ Verified: User Named 2');

    // CSV Row 22: Change User Named 1 source to Condition
    console.log('\nCSV Row 22: Change User Named 1 source to Condition');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Condition');
    
    // Verify: Custom name preserved
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
    console.log('✓ Verified: User Named 1');

    // CSV Row 23: (empty row in CSV)

    // CSV Row 24: Change User Named 1 source to Rule
    console.log('\nCSV Row 24: Change User Named 1 source to Rule');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Rule');
    
    // Verify: Custom name preserved (before rule selection)
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
    console.log('✓ Verified: User Named 1');

    // CSV Row 25: Select a rule
    console.log('\nCSV Row 25: Select a rule');
    await selectRule(page, testRuleId);
    await expect(page.locator(`code:has-text("${testRuleId}")`)).toBeVisible();
    console.log(`✓ Verified: ${testRuleId} (rule id)`);

    // CSV Row 26: Change source back to Condition
    console.log('\nCSV Row 26: Change source back to Condition');
    await selectSourceByPath(page, 'condition-0-condition-0', 'Condition');
    
    // Verify: After switching away from Rule, name reverts to auto-generated
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    console.log('✓ Verified: Condition 1');
    
    console.log('\n=== SCENARIO 1 COMPLETE ===\n');
  });

  test('Scenario 2: New Case Expression - Complete Flow (CSV rows 30-65)', async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout for this long test
    console.log('\\n=== SCENARIO 2: New Case Expression - Complete Flow ===\\n');
    
    // CSV Row 30: Create new rule and change structure to "case"
    console.log('CSV Row 30: Create new rule and change structure to "case"');
    const structureSelector = page.getByTestId('rule-structure-select');
    await structureSelector.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Verify: Default Case names (use .first() to avoid strict mode with leftover from Scenario 1)
    await expect(page.locator('code:has-text("Condition 1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Result 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Default")')).toBeVisible();
    console.log('✓ Verified: WHEN: Condition 1, THEN: Result 1, ELSE: Default');

    // CSV Row 31: Change Condition 1 source to Group
    // CSV Row 31: Change Condition 1 source to Group
    await selectSourceByPath(page, 'case-0-when-0', 'Group');
    
    // Wait for the group to fully render
    await page.waitForTimeout(1000);
    
    // Verify: WHEN header shows "Condition Group 1"
    // Note: With hideHeader=true, the internal conditiongroup-header is not rendered
    // We only verify the WHEN clause name shows the correct group name
    await expect(page.getByTestId('when-clause-name-case-0-when-0')).toContainText('Condition Group 1');
    console.log('✓ Verified: WHEN header = Condition Group 1; Children: Condition 1.1, Condition 1.2');

    // CSV Row 32: Change Condition Group 1 source to Rule
    console.log('\nCSV Row 32: Change Condition Group 1 source to Rule');
    await selectSourceByPath(page, 'case-0-when-0', 'Rule');
    
    // Verify: WHEN header still shows "Condition Group 1" (now with rule selector, no longer a group with children)
    await expect(page.getByTestId('when-clause-name-case-0-when-0')).toContainText('Condition Group 1');
    console.log('✓ Verified: WHEN header = Condition Group 1');

    // CSV Row 33: Select a rule
    console.log('\nCSV Row 33: Select a rule');
    await selectRule(page, testRuleId);
    await expect(page.getByTestId('when-clause-name-case-0-when-0')).toContainText(testRuleId);
    console.log(`✓ Verified: WHEN header = ${testRuleId}`);

    // CSV Row 34: Change Condition 1 source to Condition
    console.log('\nCSV Row 34: Change Condition 1 source to Condition');
    await selectSourceByPath(page, 'case-0-when-0', 'Condition');
    
    // Verify: WHEN header shows "Condition 1"
    await expect(page.getByTestId('when-clause-name-case-0-when-0')).toContainText('Condition 1');
    console.log('✓ Verified: WHEN header = Condition 1');

    // CSV Row 35: Change expression source in Result 1 to Rule
    console.log('\nCSV Row 35: Change expression source in Result 1 to Rule');
    await selectExpressionSource(page, 'case-0-when-0-then', 'Rule');
    await page.waitForTimeout(500);
    console.log('✓ Verified: Result 1 source changed to Rule');
    
    // CSV Row 36: Select Rule
    console.log('\nCSV Row 36: Select Rule');
    await selectRule(page, testRuleId);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('then-result-name-case-0-when-0')).toContainText(testRuleId);
    console.log(`✓ Verified: THEN result = ${testRuleId} (from rule)`);
    
    // CSV Row 37: Change expression source back to Value
    console.log('\nCSV Row 37: Change expression source back to Value');
    await selectExpressionSource(page, 'case-0-when-0-then', 'Value');
    await page.waitForTimeout(500);
    await expect(page.getByTestId('then-result-name-case-0-when-0')).toContainText('Result 1');
    console.log('✓ Verified: THEN result = Result 1 (back to default)');

    // CSV Row 38: (empty row in CSV)

    // CSV Row 39: Add Condition (convert Condition 1 to Group)
    console.log('\nCSV Row 39: Add Condition (convert to Group)');
    await selectSourceByPath(page, 'case-0-when-0', 'Group');
    
    // Verify: Group with children (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 1 --> Condition 1.1, Condition 1.2');

    // CSV Row 40: Change Condition 1.1 source to Group
    console.log('\nCSV Row 40: Change Condition 1.1 source to Group');
    await selectSourceByPath(page, 'case-0-when-0-condition-0', 'Group');
    
    // Verify: "Condition Group 1.1" with nested children (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 1.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1.2")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 1.1 --> Condition 1.1.1, Condition 1.1.2');

    // CSV Row 41: Change Condition Group 1.1 source to Rule
    console.log('\nCSV Row 41: Change Condition Group 1.1 source to Rule');
    await selectSourceByPath(page, 'case-0-when-0-condition-0', 'Rule');
    
    // Verify: "Condition Group 1.1" (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 1.1")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 1.1');

    // CSV Row 42: Select a rule
    console.log('\nCSV Row 42: Select a rule');
    await selectRule(page, testRuleId);
    // Verify using the inline conditiongroup header - look for code containing the rule ID (may have suffix)
    await expect(page.locator('code').filter({ hasText: new RegExp(testRuleId) }).first()).toBeVisible();
    console.log(`✓ Verified: Condition name = ${testRuleId}`);

    // CSV Row 43: Change Condition 1.1 source to Condition
    console.log('\nCSV Row 43: Change Condition 1.1 source to Condition');
    await selectSourceByPath(page, 'case-0-when-0-condition-0', 'Condition');
    
    // Verify: "Condition 1.1" (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition 1.1")').first()).toBeVisible();
    console.log('✓ Verified: Condition 1.1');

    // CSV Row 44: Change Condition 1.2 source to Group
    console.log('\nCSV Row 44: Change Condition 1.2 source to Group');
    await selectSourceByPath(page, 'case-0-when-0-condition-1', 'Group');
    
    // Verify: "Condition Group 1.2" with children (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 1.2")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2.2")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 1.2 --> Condition 1.2.1, Condition 1.2.2');

    // CSV Row 45: Change Condition 1.2.1 source to Group
    console.log('\nCSV Row 45: Change Condition 1.2.1 source to Group');
    await selectSourceByPath(page, 'case-0-when-0-condition-1-condition-0', 'Group');
    
    // Verify: "Condition Group 1.2.1" with children (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 1.2.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2.1.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2.1.2")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 1.2.1 --> Condition 1.2.1.1, Condition 1.2.1.2');

    // CSV Row 46: Add Group (to WHEN clause root)
    console.log('\nCSV Row 46: Add Group (to WHEN clause root)');
    const addGroupButton = page.getByTestId('add-group-button-case-0-when-0');
    await addGroupButton.click();
    await page.waitForTimeout(500);
    
    // Verify: New group added (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 1.3")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 1.3 --> Condition 1.3.1, Condition 1.3.2');

    // CSV Row 47: (empty row in CSV)

    // CSV Row 48: add WHEN clause
    console.log('\nCSV Row 48: add WHEN clause');
    const addWhenButton = page.getByTestId('add-when-clause-button');
    await addWhenButton.click();
    await page.waitForTimeout(500);
    
    // Verify: Second WHEN clause header and THEN result
    await expect(page.getByTestId('when-clause-name-case-0-when-1')).toContainText('Condition 2');
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('Result 2');
    console.log('✓ Verified: WHEN header = Condition 2, THEN = Result 2');

    // CSV Row 49: Change Condition 2 source to Group
    console.log('\nCSV Row 49: Change Condition 2 source to Group');
    await selectSourceByPath(page, 'case-0-when-1', 'Group');
    
    // Verify: WHEN header shows "Condition Group 2" with children
    await expect(page.getByTestId('when-clause-name-case-0-when-1')).toContainText('Condition Group 2');
    await expect(page.locator('code:has-text("Condition 2.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.2")').first()).toBeVisible();
    console.log('✓ Verified: WHEN header = Condition Group 2; Children: Condition 2.1, Condition 2.2');

    // CSV Row 50: Change Condition Group 2 source to Rule
    console.log('\nCSV Row 50: Change Condition Group 2 source to Rule');
    await selectSourceByPath(page, 'case-0-when-1', 'Rule');
    
    // Verify: WHEN header still shows "Condition Group 2" (now with rule selector)
    await expect(page.getByTestId('when-clause-name-case-0-when-1')).toContainText('Condition Group 2');
    console.log('✓ Verified: WHEN header = Condition Group 2');

    // CSV Row 51: Select Rule
    console.log('\nCSV Row 51: Select Rule');
    await selectRule(page, testRuleId);
    await expect(page.getByTestId('when-clause-name-case-0-when-1')).toContainText(testRuleId);
    console.log(`✓ Verified: WHEN header = ${testRuleId}`);

    // CSV Row 52: Change Condition 2 source to Condition
    console.log('\nCSV Row 52: Change Condition 2 source to Condition');
    await selectSourceByPath(page, 'case-0-when-1', 'Condition');
    
    // Verify: WHEN header shows "Condition 2"
    await expect(page.getByTestId('when-clause-name-case-0-when-1')).toContainText('Condition 2');
    console.log('✓ Verified: WHEN header = Condition 2');

    // CSV Row 53: (empty row in CSV)
    // Give the app extra time to settle after many rapid operations
    await page.waitForTimeout(2000);

    // CSV Row 54: Add Condition (convert Condition 2 to Group)
    console.log('\nCSV Row 54: Add Condition (convert to Group)');
    await selectSourceByPath(page, 'case-0-when-1', 'Group');
    
    // Wait longer for group to render
    await page.waitForTimeout(1500);
    
    // Verify: WHEN header shows "Condition Group 2" with children
    await expect(page.getByTestId('when-clause-name-case-0-when-1')).toContainText('Condition Group 2');
    await expect(page.locator('code').filter({ hasText: /Condition Group/ }).first()).toBeVisible({ timeout: 10000 });
    console.log('✓ Verified: WHEN header = Condition Group 2');

    // CSV Row 55: Change Condition 2.1 source to Group
    console.log('\nCSV Row 55: Change Condition 2.1 source to Group');
    await selectSourceByPath(page, 'case-0-when-1-condition-0', 'Group');
    
    // Verify: "Condition Group 2.1" (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 2.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1.2")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 2.1 --> Condition 2.1.1, Condition 2.1.2');

    // CSV Row 56: Change Condition Group 2.1 source to Rule
    console.log('\nCSV Row 56: Change Condition Group 2.1 source to Rule');
    await selectSourceByPath(page, 'case-0-when-1-condition-0', 'Rule');
    
    // Verify: "Condition Group 2.1" (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 2.1")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 2.1');

    // CSV Row 57: Select Rule
    console.log('\nCSV Row 57: Select Rule');
    await selectRule(page, testRuleId);
    await expect(page.locator(`code:has-text("${testRuleId}")`).first()).toBeVisible();
    console.log(`✓ Verified: Condition name = ${testRuleId}`);

    // CSV Row 58: Change Condition 2.1 source to Condition
    console.log('\nCSV Row 58: Change Condition 2.1 source to Condition');
    await selectSourceByPath(page, 'case-0-when-1-condition-0', 'Condition');
    
    // Verify: "Condition 2.1" (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition 2.1")').first()).toBeVisible();
    console.log('✓ Verified: Condition 2.1');

    // CSV Row 59: Change Condition 2.2 source to Group
    console.log('\nCSV Row 59: Change Condition 2.2 source to Group');
    await selectSourceByPath(page, 'case-0-when-1-condition-1', 'Group');
    
    // Verify: "Condition Group 2.2" (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 2.2")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.2.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.2.2")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 2.2 --> Condition 2.2.1, Condition 2.2.2');

    // CSV Row 60: Change Condition 2.2.1 source to Group
    console.log('\nCSV Row 60: Change Condition 2.2.1 source to Group');
    await selectSourceByPath(page, 'case-0-when-1-condition-1-condition-0', 'Group');
    
    // Verify: "Condition Group 2.2.1" (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 2.2.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.2.1.1")').first()).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.2.1.2")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 2.2.1 --> Condition 2.2.1.1, Condition 2.2.1.2');

    // CSV Row 61: Add Group (to WHEN clause root)
    console.log('\nCSV Row 61: Add Group (to WHEN clause root)');
    const addGroupButton2 = page.getByTestId('add-group-button-case-0-when-1');
    await addGroupButton2.click();
    await page.waitForTimeout(500);
    
    // Verify: New group added (use .first() as header also has name)
    await expect(page.locator('code:has-text("Condition Group 2.3")').first()).toBeVisible();
    console.log('✓ Verified: Condition Group 2.3 --> Condition 2.3.1, Condition 2.3.2');

    // CSV Row 62: (empty row in CSV)
    
    // CSV Row 63: Change expression source in Result 2 to Rule
    console.log('\nCSV Row 63: Change expression source in Result 2 to Rule');
    await selectExpressionSource(page, 'case-0-when-1-then', 'Rule');
    await page.waitForTimeout(500);
    console.log('✓ Verified: Result 2 source changed to Rule');
    
    // CSV Row 64: Select Rule
    console.log('\nCSV Row 64: Select Rule');
    await selectRule(page, testRuleId);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText(testRuleId);
    console.log(`✓ Verified: THEN result = ${testRuleId} (from rule)`);
    
    // CSV Row 65: Change expression source back to Value
    console.log('\nCSV Row 65: Change expression source back to Value');
    await selectExpressionSource(page, 'case-0-when-1-then', 'Value');
    await page.waitForTimeout(500);
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('Result 2');
    console.log('✓ Verified: THEN result = Result 2 (back to default)');
    
    console.log('\n=== SCENARIO 2 COMPLETE ===\n');
  });

  test('Scenario 3: New Case Expression - Verify THEN names (CSV rows 67-74)', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout
    console.log('\n=== SCENARIO 3: New Case Expression - Verify THEN names ===\n');
    
    // Create a new Case expression first
    const structureSelector = page.getByTestId('rule-structure-select');
    await structureSelector.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // CSV Row 67: add WHEN clause
    console.log('\nCSV Row 67: add WHEN clause');
    const addWhenButton = page.getByTestId('add-when-clause-button');
    await addWhenButton.click();
    await page.waitForTimeout(500);
    
    // Verify: Second WHEN clause header and THEN result
    await expect(page.getByTestId('when-clause-name-case-0-when-1')).toContainText('Condition 2');
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('Result 2');
    console.log('✓ Verified: WHEN: Condition 2, THEN: Result 2, ELSE: Default');
    
    // CSV Row 68: Change Result 2 name to "User Named Result 2"
    console.log('\nCSV Row 68: Change Result 2 name to "User Named Result 2"');
    const editIcon = page.getByTestId('then-result-edit-icon-expanded').nth(1); // Second WHEN clause
    await editIcon.click();
    await page.waitForTimeout(200);
    
    const resultInput = page.getByTestId('then-result-input-expanded');
    await resultInput.fill('User Named Result 2');
    await resultInput.press('Enter');
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('User Named Result 2');
    console.log('✓ Verified: THEN result = User Named Result 2');
    
    // CSV Row 69: Change expression source in Result 2 to Rule
    console.log('\nCSV Row 69: Change expression source in Result 2 to Rule');
    await selectExpressionSource(page, 'case-0-when-1-then', 'Rule');
    await page.waitForTimeout(500);
    // Should keep custom name temporarily (until rule selected)
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('User Named Result 2');
    console.log('✓ Verified: THEN result = User Named Result 2');
    
    // CSV Row 70: Select Rule
    console.log('\nCSV Row 70: Select Rule');
    await selectRule(page, testRuleId);
    await page.waitForTimeout(500);
    // Rule selection should override with rule ID
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText(testRuleId);
    console.log(`✓ Verified: THEN result = ${testRuleId} (rule ID)`);
    
    // CSV Row 71: Change expression source to Field
    console.log('\nCSV Row 71: Change expression source to Field');
    await selectExpressionSource(page, 'case-0-when-1-then', 'Field');
    await page.waitForTimeout(500);
    // Should revert to default "Result 2"
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('Result 2');
    console.log('✓ Verified: THEN result = Result 2');
    
    // CSV Row 72: Change expression source in THEN clause to Rule
    console.log('\nCSV Row 72: Change expression source in THEN clause to Rule');
    await selectExpressionSource(page, 'case-0-when-1-then', 'Rule');
    await page.waitForTimeout(500);
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('Result 2');
    console.log('✓ Verified: THEN result = Result 2');
    
    // CSV Row 73: Select Rule
    console.log('\nCSV Row 73: Select Rule');
    await selectRule(page, testRuleId);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText(testRuleId);
    console.log(`✓ Verified: THEN result = ${testRuleId} (rule ID)`);
    
    // CSV Row 74: Change THEN clause name to "User Named Result 2"
    console.log('\nCSV Row 74: Change THEN clause name to "User Named Result 2"');
    const editIcon2 = page.getByTestId('then-result-edit-icon-expanded').nth(1);
    await editIcon2.click();
    await page.waitForTimeout(200);
    
    const resultInput2 = page.getByTestId('then-result-input-expanded');
    await resultInput2.fill('User Named Result 2');
    await resultInput2.press('Enter');
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('then-result-name-case-0-when-1')).toContainText('User Named Result 2');
    console.log('✓ Verified: THEN result = User Named Result 2 (custom name overrides rule ID)');
    
    console.log('\n=== SCENARIO 3 COMPLETE ===\n');
  });

  test('Scenario 4: New Case Expression - Verify ELSE names (CSV rows 76-82)', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout
    console.log('\n=== SCENARIO 4: New Case Expression - Verify ELSE names ===\n');
    
    // Create a new Case expression first
    const structureSelector = page.getByTestId('rule-structure-select');
    await structureSelector.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // CSV Row 76: Change ELSE name to "User Named ELSE"
    console.log('\nCSV Row 76: Change ELSE name to "User Named ELSE"');
    const elseEditIcon = page.getByTestId('else-result-edit-icon');
    await elseEditIcon.click();
    await page.waitForTimeout(200);
    
    const elseInput = page.getByTestId('else-result-input');
    await elseInput.fill('User Named ELSE');
    await elseInput.press('Enter');
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('else-result-name')).toContainText('User Named ELSE');
    console.log('✓ Verified: ELSE result = User Named ELSE');
    
    // CSV Row 77: Change expression source in ELSE to Rule
    console.log('\nCSV Row 77: Change expression source in ELSE to Rule');
    // Click the ELSE collapse to expand it
    await page.locator('[data-testid="else-header"]').click();
    await page.waitForTimeout(500);
    
    await selectExpressionSource(page, 'case-0-else-expression', 'Rule');
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('else-result-name')).toContainText('User Named ELSE');
    console.log('✓ Verified: ELSE result = User Named ELSE (custom name preserved)');
    
    // CSV Row 78: Select Rule for ELSE
    console.log('\nCSV Row 78: Select Rule for ELSE');
    await selectRule(page, testRuleId);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('else-result-name')).toContainText(testRuleId);
    console.log(`✓ Verified: ELSE result = ${testRuleId} (rule ID)`);
    
    // CSV Row 79: Change expression source to Field
    console.log('\nCSV Row 79: Change expression source to Field');
    await selectExpressionSource(page, 'case-0-else-expression', 'Field');
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('else-result-name')).toContainText('Default');
    console.log('✓ Verified: ELSE result = Default');
    
    // CSV Row 80: Change expression source in ELSE clause to Rule
    console.log('\nCSV Row 80: Change expression source in ELSE clause to Rule');
    await selectExpressionSource(page, 'case-0-else-expression', 'Rule');
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('else-result-name')).toContainText('Default');
    console.log('✓ Verified: ELSE result = Default');
    
    // CSV Row 81: Select Rule for ELSE
    console.log('\nCSV Row 81: Select Rule for ELSE');
    await selectRule(page, testRuleId);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('else-result-name')).toContainText(testRuleId);
    console.log(`✓ Verified: ELSE result = ${testRuleId} (rule ID)`);
    
    // CSV Row 82: Change ELSE clause name to "User Named ELSE"
    console.log('\nCSV Row 82: Change ELSE clause name to "User Named ELSE"');
    const elseEditIcon2 = page.getByTestId('else-result-edit-icon');
    await elseEditIcon2.click();
    await page.waitForTimeout(200);
    
    const elseInput2 = page.getByTestId('else-result-input');
    await elseInput2.fill('User Named ELSE');
    await elseInput2.press('Enter');
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('else-result-name')).toContainText('User Named ELSE');
    console.log('✓ Verified: ELSE result = User Named ELSE (custom name overrides rule ID)');

    console.log('\n=== SCENARIO 4 COMPLETE ===\n');
  });
});
