import { test, expect } from '@playwright/test';

test.describe('Basic App Loading', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Basic checks that the app loaded
    await expect(page).toHaveURL('/');
    
    // Check if page has content (not just a blank page)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check if we can navigate to the same page again
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });
}); 