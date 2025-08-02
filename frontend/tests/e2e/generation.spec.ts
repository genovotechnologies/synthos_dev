import { test, expect } from '@playwright/test';

test.describe('Data Generation UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to generation page', async ({ page }) => {
    await page.click('text=Features');
    await page.click('text=Data Generation');
    await expect(page).toHaveURL(/.*generation/);
    await expect(page.locator('h1')).toContainText('Synthetic Data Generation');
  });

  test('should display generation form elements', async ({ page }) => {
    await page.goto('/dashboard/generation');
    
    // Should show form elements
    await expect(page.locator('select[name="datasetId"]')).toBeVisible();
    await expect(page.locator('input[name="rows"]')).toBeVisible();
    await expect(page.locator('select[name="privacyLevel"]')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Data")')).toBeVisible();
  });

  test('should show validation for empty form', async ({ page }) => {
    await page.goto('/dashboard/generation');
    
    // Try to generate without selecting dataset
    await page.click('button:has-text("Generate Data")');
    
    await expect(page.locator('text=Please select a dataset')).toBeVisible();
  });

  test('should show validation for invalid row count', async ({ page }) => {
    await page.goto('/dashboard/generation');
    
    // Select dataset
    await page.click('select[name="datasetId"]');
    await page.click('option[value="1"]');
    
    // Try with invalid row count
    await page.fill('input[name="rows"]', '-1');
    await page.click('button:has-text("Generate Data")');
    
    await expect(page.locator('text=Row count must be positive')).toBeVisible();
  });

  test('should show privacy level options', async ({ page }) => {
    await page.goto('/dashboard/generation');
    
    await page.click('select[name="privacyLevel"]');
    
    await expect(page.locator('option[value="low"]')).toBeVisible();
    await expect(page.locator('option[value="medium"]')).toBeVisible();
    await expect(page.locator('option[value="high"]')).toBeVisible();
  });

  test('should navigate to datasets page', async ({ page }) => {
    await page.goto('/dashboard/datasets');
    
    await expect(page.locator('h1')).toContainText('Datasets');
    await expect(page.locator('button:has-text("Upload Dataset")')).toBeVisible();
  });

  test('should show upload form elements', async ({ page }) => {
    await page.goto('/dashboard/datasets');
    
    await page.click('text=Upload Dataset');
    
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('button:has-text("Upload")')).toBeVisible();
  });

  test('should show file type validation', async ({ page }) => {
    await page.goto('/dashboard/datasets');
    
    await page.click('text=Upload Dataset');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-data.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not a CSV file')
    });
    
    await expect(page.locator('text=Please upload a CSV file')).toBeVisible();
  });
}); 