import { test, expect } from '@playwright/test';

test.describe('Basic App Loading', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Basic checks that the app loaded
    await expect(page).toHaveURL('/');
    
    // Check if page has content (not just a blank page)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    
    // Check if html element is attached
    await expect(page.locator('html')).toBeAttached();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if we can navigate to the same page again
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
  });
}); 