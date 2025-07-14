import { test, expect } from '@playwright/test';

test.describe('Data Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should upload dataset successfully', async ({ page }) => {
    await page.goto('/dashboard/datasets');
    
    // Click upload button
    await page.click('text=Upload Dataset');
    
    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('name,age,email\nJohn,30,john@test.com\nJane,25,jane@test.com')
    });
    
    await page.click('button:has-text("Upload")');
    
    // Should show success message
    await expect(page.locator('text=Dataset uploaded successfully')).toBeVisible();
    
    // Should display in datasets list
    await expect(page.locator('text=test-data.csv')).toBeVisible();
  });

  test('should generate synthetic data', async ({ page }) => {
    await page.goto('/dashboard/generation');
    
    // Select dataset
    await page.click('select[name="datasetId"]');
    await page.click('option[value="1"]');
    
    // Configure generation parameters
    await page.fill('input[name="rows"]', '1000');
    await page.selectOption('select[name="privacyLevel"]', 'high');
    
    // Start generation
    await page.click('button:has-text("Generate Data")');
    
    // Should show generation in progress
    await expect(page.locator('text=Generating synthetic data')).toBeVisible();
    
    // Wait for completion (or timeout)
    await expect(page.locator('text=Generation completed')).toBeVisible({ timeout: 30000 });
    
    // Should have download button
    await expect(page.locator('button:has-text("Download")')).toBeVisible();
  });

  test('should show real-time generation progress', async ({ page }) => {
    await page.goto('/dashboard/generation');
    
    // Start generation
    await page.click('select[name="datasetId"]');
    await page.click('option[value="1"]');
    await page.fill('input[name="rows"]', '500');
    await page.click('button:has-text("Generate Data")');
    
    // Should show progress bar
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // Should show percentage
    await expect(page.locator('text=0%')).toBeVisible();
    
    // Progress should update
    await page.waitForSelector('text=100%', { timeout: 30000 });
  });

  test('should validate generation parameters', async ({ page }) => {
    await page.goto('/dashboard/generation');
    
    // Try to generate without selecting dataset
    await page.click('button:has-text("Generate Data")');
    
    await expect(page.locator('text=Please select a dataset')).toBeVisible();
    
    // Try with invalid row count
    await page.click('select[name="datasetId"]');
    await page.click('option[value="1"]');
    await page.fill('input[name="rows"]', '-1');
    await page.click('button:has-text("Generate Data")');
    
    await expect(page.locator('text=Row count must be positive')).toBeVisible();
  });

  test('should show generation history', async ({ page }) => {
    await page.goto('/dashboard/generation/history');
    
    // Should show list of previous generations
    await expect(page.locator('h1')).toContainText('Generation History');
    
    // Should show status of each generation
    await expect(page.locator('[data-testid="generation-status"]')).toBeVisible();
    
    // Should allow downloading completed generations
    const downloadButton = page.locator('button:has-text("Download")').first();
    if (await downloadButton.isVisible()) {
      await expect(downloadButton).toBeEnabled();
    }
  });

  test('should handle generation errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/v1/generation/generate', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid dataset format' })
      });
    });
    
    await page.goto('/dashboard/generation');
    
    await page.click('select[name="datasetId"]');
    await page.click('option[value="1"]');
    await page.fill('input[name="rows"]', '100');
    await page.click('button:has-text("Generate Data")');
    
    // Should show error message
    await expect(page.locator('text=Invalid dataset format')).toBeVisible();
    
    // Should allow retry
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
}); 