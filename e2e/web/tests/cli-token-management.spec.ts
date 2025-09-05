import { test, expect, Page } from '@playwright/test';

test.describe('CLI Token Management', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [{
          origin: 'http://localhost:3000',
          localStorage: [{
            name: '__clerk_db_jwt',
            value: 'test-jwt-token'
          }]
        }]
      }
    });
    page = await context.newPage();
  });

  test('should display token management page', async () => {
    await page.goto('/settings/tokens');
    
    await expect(page).toHaveTitle(/Token/i);
    await expect(page.locator('h1')).toContainText(/CLI Tokens/i);
  });

  test('should generate a new CLI token', async () => {
    await page.goto('/settings/tokens');
    
    const generateButton = page.locator('button:has-text("Generate New Token")');
    await expect(generateButton).toBeVisible();
    
    await generateButton.click();
    
    const tokenDisplay = page.locator('[data-testid="token-display"]');
    await expect(tokenDisplay).toBeVisible();
    
    const tokenValue = await tokenDisplay.inputValue();
    expect(tokenValue).toMatch(/^uspark_[a-zA-Z0-9]+$/);
  });

  test('should copy token to clipboard', async () => {
    await page.goto('/settings/tokens');
    
    await page.locator('button:has-text("Generate New Token")').click();
    
    const copyButton = page.locator('button[aria-label="Copy token"]');
    await expect(copyButton).toBeVisible();
    
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (text: string) => {
        (window as any).copiedText = text;
        return Promise.resolve();
      };
    });
    
    await copyButton.click();
    
    const copiedText = await page.evaluate(() => (window as any).copiedText);
    expect(copiedText).toMatch(/^uspark_[a-zA-Z0-9]+$/);
    
    const successMessage = page.locator('text=/copied/i');
    await expect(successMessage).toBeVisible();
  });

  test('should show token only once', async () => {
    await page.goto('/settings/tokens');
    
    await page.locator('button:has-text("Generate New Token")').click();
    
    const tokenDisplay = page.locator('[data-testid="token-display"]');
    const initialToken = await tokenDisplay.inputValue();
    
    await page.reload();
    
    await expect(tokenDisplay).not.toBeVisible();
    
    const tokenList = page.locator('[data-testid="token-list"]');
    await expect(tokenList).toContainText('••••••••');
  });

  test('should list existing tokens', async () => {
    await page.goto('/settings/tokens');
    
    await page.locator('button:has-text("Generate New Token")').click();
    await page.waitForTimeout(1000);
    
    await page.reload();
    
    const tokenList = page.locator('[data-testid="token-list"]');
    await expect(tokenList).toBeVisible();
    
    const tokenItems = tokenList.locator('[data-testid="token-item"]');
    await expect(tokenItems).toHaveCount(1);
  });

  test('should revoke a token', async () => {
    await page.goto('/settings/tokens');
    
    await page.locator('button:has-text("Generate New Token")').click();
    await page.waitForTimeout(1000);
    
    await page.reload();
    
    const revokeButton = page.locator('button[aria-label="Revoke token"]').first();
    await expect(revokeButton).toBeVisible();
    
    await revokeButton.click();
    
    const confirmDialog = page.locator('[role="dialog"]');
    await expect(confirmDialog).toBeVisible();
    
    await page.locator('button:has-text("Confirm")').click();
    
    const successMessage = page.locator('text=/revoked/i');
    await expect(successMessage).toBeVisible();
    
    const tokenList = page.locator('[data-testid="token-list"]');
    const tokenItems = tokenList.locator('[data-testid="token-item"]');
    await expect(tokenItems).toHaveCount(0);
  });

  test.afterEach(async () => {
    await page.close();
  });
});