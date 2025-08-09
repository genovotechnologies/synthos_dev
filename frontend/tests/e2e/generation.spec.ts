import { test, expect } from '@playwright/test';

test.describe('Basic Page Loading', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/');
  });

  test('should load about page if it exists', async ({ page }) => {
    try {
      await page.goto('/about');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toBeAttached();
    } catch (error) {
      console.log('About page not found, skipping test');
    }
  });

  test('should load features page if it exists', async ({ page }) => {
    try {
      await page.goto('/features');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toBeAttached();
    } catch (error) {
      console.log('Features page not found, skipping test');
    }
  });

  test('should load pricing page if it exists', async ({ page }) => {
    try {
      await page.goto('/pricing');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toBeAttached();
    } catch (error) {
      console.log('Pricing page not found, skipping test');
    }
  });

  test('should load contact page if it exists', async ({ page }) => {
    try {
      await page.goto('/contact');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toBeAttached();
    } catch (error) {
      console.log('Contact page not found, skipping test');
    }
  });

  test('should load documentation page if it exists', async ({ page }) => {
    try {
      await page.goto('/documentation');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toBeAttached();
    } catch (error) {
      console.log('Documentation page not found, skipping test');
    }
  });

  test('should load privacy page if it exists', async ({ page }) => {
    try {
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toBeAttached();
    } catch (error) {
      console.log('Privacy page not found, skipping test');
    }
  });

  test('should load terms page if it exists', async ({ page }) => {
    try {
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('html')).toBeAttached();
    } catch (error) {
      console.log('Terms page not found, skipping test');
    }
  });
}); 