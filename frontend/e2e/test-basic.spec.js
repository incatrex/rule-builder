/**
 * Basic smoke test to verify server is accessible
 */

import { test, expect } from '@playwright/test';

test('can load the application', async ({ page }) => {
  await page.goto('http://localhost:3003');
  
  // Check if the page loads
  await expect(page).toHaveTitle(/Rule Builder/i);
  
  // Check if main container is visible
  await expect(page.locator('.rule-builder-container')).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Application loaded successfully');
});

test('can find condition source selector', async ({ page }) => {
  await page.goto('http://localhost:3003');
  await page.waitForLoadState('networkidle');
  
  // Wait for rule builder to render
  await page.waitForSelector('.rule-builder-container', { timeout: 10000 });
  
  // Expand the default condition
  const conditionHeader = page.locator('.ant-collapse-header').first();
  await conditionHeader.click();
  await page.waitForTimeout(500);
  
  // Look for the condition source selector
  const selector = page.getByTestId('condition-source-selector').first();
  await expect(selector).toBeVisible({ timeout: 5000 });
  
  console.log('✓ Condition source selector found');
});
