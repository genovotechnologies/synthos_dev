import { test, expect } from '@playwright/test';

test.describe('Basic App Loading', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for body to be visible
    await page.waitForSelector('body', { state: 'visible', timeout: 15000 });
    
    // Wait for main content to be present
    await page.waitForSelector('#main-content', { state: 'visible', timeout: 15000 });
    
    // Wait a bit more for any client-side JavaScript to complete
    await page.waitForTimeout(2000);
    
    // Basic checks that the app loaded
    await expect(page).toHaveURL('/');
    
    // Check if page has content (not just a blank page)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    
    // Check if main content is present
    const mainContent = await page.locator('#main-content').textContent();
    expect(mainContent).toBeTruthy();
    
    // Check if the page has some basic content (not just a blank page)
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      const mainContent = document.getElementById('main-content');
      return body && mainContent && (body.textContent?.trim().length > 0 || mainContent.textContent?.trim().length > 0);
    });
    
    expect(hasContent).toBeTruthy();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for main content to be present
    await page.waitForSelector('#main-content', { state: 'visible', timeout: 15000 });
    
    // Wait a bit more for any client-side JavaScript to complete
    await page.waitForTimeout(2000);
    
    // Check if we can navigate to the same page again
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });
}); 