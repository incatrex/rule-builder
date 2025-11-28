/**
 * Condition Naming Scenarios - E2E Tests
 * 
 * This test file explicitly walks through the scenarios from test-scenarios-condition-names.csv
 * Tests the actual UI with real browser interactions in Playwright
 */

import { test, expect } from '@playwright/test';

// Helper function to select an option from Ant Design Select
// Uses keyboard navigation which is more reliable than clicking dropdown options
async function selectSourceOption(page, selector, optionText) {
  // Click the selector to focus it
  await selector.click();
  
  // Wait for dropdown to open
  await page.waitForTimeout(300);
  
  // Use keyboard to navigate based on option
  // Ant Design Select responds to keyboard input
  if (optionText === 'Condition') {
    // First option - press Enter immediately or arrow up to first
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
  } else if (optionText === 'Group') {
    // Second option
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  } else if (optionText === 'Rule') {
    // Third option
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  }
  
  // Wait for the change to be processed
  await page.waitForTimeout(300);
}

test.describe('Condition Naming Scenarios - Simple Condition Structure', () => {
  test.beforeEach(async ({ page }) => {
    // Set shorter timeout for tests
    test.setTimeout(60000); // 60 seconds per test
    
    await page.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.rule-builder-container', { timeout: 15000 });
    
    // Wait a bit for initialization
    await page.waitForTimeout(1000);
  });

  test('CSV Scenario 1: New Simple Condition - Default Names and Source Changes', async ({ page }) => {
    // Step 1: Verify default structure shows "Condition" (no number at root level)
    const conditionHeader = page.locator('.ant-collapse-header').first();
    await conditionHeader.click();
    
    const conditionName = page.locator('code:has-text("Condition")').first();
    await expect(conditionName).toBeVisible();

    // Step 2: Change source to Group
    const sourceSelector = page.getByTestId('condition-source-selector').first();
    await selectSourceOption(page, sourceSelector, 'Group');

    // Verify: "Condition Group" with children "Condition 1", "Condition 2"
    await expect(page.locator('code:has-text("Condition Group")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2")')).toBeVisible();

    // Step 3: Change source to Rule
    await selectSourceOption(page, sourceSelector, 'Rule');

    // Verify: Name should revert or show rule selector
    await expect(page.locator('code:has-text("Condition")')).toBeVisible();

    // Step 4: Select a Rule (would require rule selection UI)
    // Skip for now - needs rule selector implementation

    // Step 5: Change source back to Condition
    await selectSourceOption(page, sourceSelector, 'Condition');

    // Verify: Should show "Condition"
    await expect(page.locator('code:has-text("Condition")').first()).toBeVisible();
  });

  test('CSV Scenario 2: Add Condition and Convert Children', async ({ page }) => {
    const conditionHeader = page.locator('.ant-collapse-header').first();
    await conditionHeader.click();

    // Step 1: Convert to group
    const sourceSelector = page.getByTestId('condition-source-selector').first();
    await selectSourceOption(page, sourceSelector, 'Group');

    // Verify: "Condition Group" with "Condition 1", "Condition 2"
    await expect(page.locator('code:has-text("Condition Group")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2")')).toBeVisible();

    // Step 2: Change Condition 1 source to Group
    const allSelectors = page.getByTestId('condition-source-selector');
    await selectSourceOption(page, allSelectors.nth(1), 'Group');

    // Verify: "Condition Group 1" with "Condition 1.1", "Condition 1.2"
    await expect(page.locator('code:has-text("Condition Group 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2")')).toBeVisible();

    // Step 3: Change Condition 1 source to Rule
    await selectSourceOption(page, allSelectors.nth(1), 'Rule');

    // Verify: Should show "Condition 1"
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();

    // Step 5: Change Condition 1 source back to Condition
    await selectSourceOption(page, allSelectors.nth(1), 'Condition');

    // Verify: Should show "Condition 1"
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
  });

  test('CSV Scenario 3: Deep Nesting - Condition 2.1 to Group', async ({ page }) => {
    const conditionHeader = page.locator('.ant-collapse-header').first();
    await conditionHeader.click();

    // Convert to group
    const sourceSelector = page.getByTestId('condition-source-selector').first();
    await selectSourceOption(page, sourceSelector, 'Group');

    await expect(page.locator('code:has-text("Condition 2")')).toBeVisible();

    // Find Condition 2 and its selector - use test ID for reliable targeting
    const condition2Header = page.getByTestId('condition-header-condition-2');
    const condition2Selector = condition2Header.getByTestId('condition-source-selector');
    await selectSourceOption(page, condition2Selector, 'Group');

    // Verify: "Condition Group 2" with "Condition 2.1", "Condition 2.2"
    await expect(page.locator('code:has-text("Condition Group 2")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.2")')).toBeVisible();

    // Convert Condition 2.1 to Group using test ID
    const condition21Header = page.getByTestId('condition-header-condition-2.1');
    const condition21Selector = condition21Header.getByTestId('condition-source-selector');
    await selectSourceOption(page, condition21Selector, 'Group');

    // Verify: "Condition Group 2.1" with "Condition 2.1.1", "Condition 2.1.2"
    await expect(page.locator('code:has-text("Condition Group 2.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 2.1.2")')).toBeVisible();
  });

  test('CSV Scenario 4: User Renaming Preserves Custom Names', async ({ page }) => {
    const conditionHeader = page.locator('.ant-collapse-header').first();
    await conditionHeader.click();

    // Convert to group to get "Condition 1"
    const sourceSelector = page.getByTestId('condition-source-selector').first();
    await selectSourceOption(page, sourceSelector, 'Group');

    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();

    // Step 1: Change Condition 1 name to "User Named 1"
    const condition1Header = page.getByTestId('condition-header-condition-1');
    const editIcon = condition1Header.locator('.anticon-edit');
    await editIcon.click();

    // Wait for name input (textbox) to appear and fill it
    const nameInput = condition1Header.getByRole('textbox');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.clear();
    await nameInput.fill('User Named 1');
    await nameInput.press('Enter');

    // Verify: Name changed to "User Named 1"
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();

    // Step 2: Change User Named 1 source to Group
    const allSelectors = page.getByTestId('condition-source-selector');
    await selectSourceOption(page, allSelectors.nth(1), 'Group');

    // Verify: Name preserved as "User Named 1", children are "Condition 1.1", "Condition 1.2"
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2")')).toBeVisible();

    // Step 3: Change User Named 1 source back to Condition
    await selectSourceOption(page, allSelectors.nth(1), 'Condition');

    // Verify: Custom name still "User Named 1"
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();

    // Step 4: Change User Named 1 source back to Group again
    await selectSourceOption(page, allSelectors.nth(1), 'Group');

    // Verify: Custom name still preserved
    await expect(page.locator('code:has-text("User Named 1")')).toBeVisible();
  });

  test('CSV Scenario 5: Rule Reference Replaces Custom Name', async ({ page }) => {
    const conditionHeader = page.locator('.ant-collapse-header').first();
    await conditionHeader.click();

    const sourceSelector = page.getByTestId('condition-source-selector').first();
    await selectSourceOption(page, sourceSelector, 'Group');

    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();

    // Step 1: Change Condition 1 source to Rule
    const allSelectors = page.getByTestId('condition-source-selector');
    await selectSourceOption(page, allSelectors.nth(1), 'Rule');

    // Verify: Name should still show "Condition 1" (until rule selected)
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();

    // Step 2: Select Rule "SAVE" - would require rule selector
    // Skip for now

    // Step 3: Change source back to Condition
    await selectSourceOption(page, allSelectors.nth(1), 'Condition');

    // Verify: Name reverts to auto-generated "Condition 1"
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
  });
});

test.describe('Condition Naming Scenarios - Case Expression Structure', () => {
  test.beforeEach(async ({ page }) => {
    // Set shorter timeout for tests
    test.setTimeout(60000); // 60 seconds per test
    
    await page.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.rule-builder-container', { timeout: 15000 });
    
    // Wait a bit for initialization
    await page.waitForTimeout(1000);
  });

  test('CSV Scenario 6: New Case Expression - Default Names', async ({ page }) => {
    // Change structure to "case" using keyboard navigation
    const structureSelect = page.locator('text=Simple Condition');
    await structureSelect.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Verify: WHEN shows "Condition 1", THEN shows "Result 1", ELSE shows "Default"
    await expect(page.locator('text=WHEN')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    await expect(page.locator('text=THEN')).toBeVisible();
    await expect(page.locator('code:has-text("Result 1")')).toBeVisible();
    await expect(page.locator('text=ELSE')).toBeVisible();
    await expect(page.locator('code:has-text("Default")')).toBeVisible();
  });

  test('CSV Scenario 7: WHEN Condition Source Conversions', async ({ page }) => {
    // Change to case structure using keyboard navigation
    const structureSelect = page.locator('text=Simple Condition');
    await structureSelect.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();

    // Step 1: Change Condition 1 source to Group
    const sourceSelector = page.getByTestId('condition-source-selector').first();
    await selectSourceOption(page, sourceSelector, 'Group');

    // Verify: "Condition Group 1" with children "Condition 1.1", "Condition 1.2"
    await expect(page.locator('code:has-text("Condition Group 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2")')).toBeVisible();

    // Step 2: Change source to Rule
    await selectSourceOption(page, sourceSelector, 'Rule');

    // Verify: Name preserved
    await expect(page.locator('code:has-text("Condition")').first()).toBeVisible();

    // Step 3: Change source back to Condition
    await selectSourceOption(page, sourceSelector, 'Condition');

    // Verify: Reverts to "Condition 1"
    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
  });

  test('CSV Scenario 8: Multiple WHEN Clauses', async ({ page }) => {
    // Change to case structure using keyboard navigation
    const structureSelect = page.locator('text=Simple Condition');
    await structureSelect.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('code:has-text("Condition 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Result 1")')).toBeVisible();

    // Step 1: Add second WHEN clause
    const addWhenButton = page.getByTestId('add-when-clause-button');
    await addWhenButton.click();

    // Verify: Second WHEN shows "Condition 2" and "Result 2"
    await expect(page.locator('code:has-text("Condition 2")')).toBeVisible();
    await expect(page.locator('code:has-text("Result 2")')).toBeVisible();

    // Verify ELSE is still "Default"
    await expect(page.locator('code:has-text("Default")')).toBeVisible();
  });

  test('CSV Scenario 9: Nested Groups in WHEN Clause', async ({ page }) => {
    // Change to case structure using keyboard navigation
    const structureSelect = page.locator('text=Simple Condition');
    await structureSelect.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Step 1: Convert Condition 1 to Group
    const sourceSelector = page.getByTestId('condition-source-selector').first();
    await selectSourceOption(page, sourceSelector, 'Group');

    await expect(page.locator('code:has-text("Condition Group 1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.2")')).toBeVisible();

    // Step 2: Convert Condition 1.1 to Group
    const allSelectors = page.getByTestId('condition-source-selector');
    await selectSourceOption(page, allSelectors.nth(1), 'Group');

    // Verify: "Condition Group 1.1" with "Condition 1.1.1", "Condition 1.1.2"
    await expect(page.locator('code:has-text("Condition Group 1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1.1")')).toBeVisible();
    await expect(page.locator('code:has-text("Condition 1.1.2")')).toBeVisible();

    // Step 3: Add Group to WHEN clause root
    const addGroupButton = page.getByTestId('add-group-button').first();
    await addGroupButton.click();

    // Verify: "Condition Group 3" is added
    await expect(page.locator('code:has-text("Condition Group 3")')).toBeVisible();
  });

  test('CSV Scenario 10: User Renamed Result with Rule Reference', async ({ page }) => {
    // Change to case structure using keyboard navigation
    const structureSelect = page.locator('text=Simple Condition');
    await structureSelect.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Add second WHEN clause
    const addWhenButton = page.getByTestId('add-when-clause-button');
    await addWhenButton.click();

    await expect(page.locator('code:has-text("Result 2")')).toBeVisible();

    // Step 1: Change Result 2 name to "User Named Result 2"
    const editIcon = page.locator('code:has-text("Result 2")').locator('..').locator('.anticon-edit').first();
    await editIcon.click();

    const nameInput = page.locator('input[value="Result 2"]');
    await nameInput.clear();
    await nameInput.fill('User Named Result 2');
    await nameInput.press('Enter');

    // Verify: Name changed to "User Named Result 2"
    await expect(page.locator('code:has-text("User Named Result 2")')).toBeVisible();

    // Step 2-4: Would require expression source selector implementation
    // Skip for now - needs expression source selector in THEN clause
  });
});
