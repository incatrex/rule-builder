import { test, expect } from '@playwright/test';

/**
 * Test to verify THEN result names show rule IDs when rules are selected
 */

test.describe('THEN Result Names', () => {
  test('should show rule ID when rule is selected as THEN expression', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3004');
    await page.waitForLoadState('networkidle');

    // Create new rule
    const newRuleButton = page.getByTestId('new-rule-button');
    await newRuleButton.click();
    await page.waitForTimeout(500);

    // Change structure to Case
    const structureSelect = page.locator('.ant-select').filter({ hasText: 'Condition' }).first();
    await structureSelect.click();
    await page.waitForTimeout(200);
    
    const caseOption = page.locator('.ant-select-item').filter({ hasText: 'Case' });
    await caseOption.click();
    await page.waitForTimeout(1000);

    console.log('✓ Case structure created');

    // Verify initial THEN result name is "Result 1"
    await expect(page.getByTestId('then-result-name-case-0-when-0')).toContainText('Result 1');
    console.log('✓ Initial THEN result name: Result 1');

    // Change THEN expression source to Rule
    const expressionSourceSelector = page.getByTestId('expression-source-selector-case-0-when-0-then');
    await expressionSourceSelector.click();
    await page.waitForTimeout(200);
    
    const ruleOption = page.locator('.ant-select-dropdown').locator('.ant-select-item').filter({ hasText: 'Rule' });
    await ruleOption.scrollIntoViewIfNeeded();
    await ruleOption.click({ force: true });
    await page.waitForTimeout(500);

    console.log('✓ Changed THEN expression source to Rule');

    // Select SAVE rule
    await page.waitForTimeout(1000);
    const ruleSelector = page.locator('.ant-select').filter({ hasText: 'Select a rule' }).first();
    await ruleSelector.click();
    await page.waitForTimeout(500);
    
    const saveRule = page.locator('.ant-select-dropdown').locator('.ant-select-item').filter({ hasText: 'SAVE' });
    await saveRule.scrollIntoViewIfNeeded();
    await saveRule.click({ force: true });
    await page.waitForTimeout(1000);

    console.log('✓ Selected SAVE rule');

    // Verify THEN result name now shows "SAVE" (from rule)
    await expect(page.getByTestId('then-result-name-case-0-when-0')).toContainText('SAVE');
    console.log('✓ THEN result name now shows: SAVE (from rule ID)');

    // Change back to Value
    await expressionSourceSelector.click();
    await page.waitForTimeout(200);
    
    const valueOption = page.locator('.ant-select-dropdown').locator('.ant-select-item').filter({ hasText: 'Value' });
    await valueOption.scrollIntoViewIfNeeded();
    await valueOption.click({ force: true });
    await page.waitForTimeout(500);

    console.log('✓ Changed back to Value');

    // Verify THEN result name reverts to "Result 1"
    await expect(page.getByTestId('then-result-name-case-0-when-0')).toContainText('Result 1');
    console.log('✓ THEN result name reverted to: Result 1');

    console.log('\n✅ TEST PASSED: THEN result names correctly show rule IDs');
  });
});
