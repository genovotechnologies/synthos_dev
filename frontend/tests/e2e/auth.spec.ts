import { test, expect } from '@playwright/test';

test.describe('Authentication UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Sign in to Synthos');
  });

  test('should display signup page', async ({ page }) => {
    await page.click('text=Get Started');
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.locator('h1')).toContainText('Create your account');
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show form validation for invalid email', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });

  test('should show password requirements on signup', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should show terms agreement requirement', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'StrongPassword123!');
    await page.fill('input[name="confirmPassword"]', 'StrongPassword123!');
    // Don't check terms agreement
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=You must agree to the terms')).toBeVisible();
  });
}); 