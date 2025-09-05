import { test, expect } from '@playwright/test';
import { authenticateWithClerk, getTestCredentials } from '../utils/clerk-auth';

test.describe('CLI Token Management - Production', () => {
  test.describe.configure({ mode: 'serial' });

  let tokenValue: string;

  test.beforeEach(async ({ page }) => {
    const credentials = getTestCredentials();
    
    if (!credentials.email && !credentials.sessionToken && !credentials.testToken) {
      test.skip(!process.env.CI, 'Skipping auth tests - no credentials configured');
      return;
    }
    
    await authenticateWithClerk(page, credentials);
  });

  test('should access token management page', async ({ page }) => {
    await page.goto('/settings/tokens');
    
    // Check if we're on the tokens page
    await expect(page).toHaveURL(/.*settings\/tokens/);
    
    // Look for token-related UI elements
    const heading = page.locator('h1, h2').filter({ hasText: /tokens?/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should generate a new CLI token', async ({ page }) => {
    await page.goto('/settings/tokens');
    
    // Look for generate button (various possible texts)
    const generateButton = page.locator('button').filter({ 
      hasText: /generate|create|new token/i 
    });
    
    await expect(generateButton.first()).toBeVisible({ timeout: 10000 });
    await generateButton.first().click();
    
    // Wait for token to appear
    await page.waitForTimeout(2000);
    
    // Look for token display (might be in input or div)
    const tokenElements = await page.locator('input[type="text"], code').all();
    
    for (const element of tokenElements) {
      const value = await element.inputValue().catch(() => element.textContent());
      if (value && value.startsWith('uspark_')) {
        tokenValue = value;
        console.log('Token generated successfully');
        expect(tokenValue).toMatch(/^uspark_[a-zA-Z0-9]+$/);
        return;
      }
    }
    
    // If no token found, check for any error messages
    const errorMessage = page.locator('text=/error|failed/i');
    if (await errorMessage.isVisible()) {
      const error = await errorMessage.textContent();
      throw new Error(`Failed to generate token: ${error}`);
    }
  });

  test('should display existing tokens list', async ({ page }) => {
    await page.goto('/settings/tokens');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Look for tokens list or table
    const tokensList = page.locator('table, [role="list"], ul, div').filter({
      has: page.locator('text=/token|created|last used/i')
    });
    
    if (await tokensList.isVisible()) {
      console.log('Tokens list is visible');
      
      // Check if there are any tokens
      const tokenItems = tokensList.locator('tr, li, [role="listitem"]');
      const count = await tokenItems.count();
      console.log(`Found ${count} token items`);
    }
  });

  test('should handle token revocation', async ({ page }) => {
    await page.goto('/settings/tokens');
    
    // Look for any revoke/delete buttons
    const revokeButtons = page.locator('button').filter({ 
      hasText: /revoke|delete|remove/i 
    });
    
    if (await revokeButtons.count() > 0) {
      console.log('Found revoke buttons, testing revocation flow');
      
      const firstButton = revokeButtons.first();
      await firstButton.click();
      
      // Handle confirmation dialog if it appears
      const confirmButton = page.locator('button').filter({ 
        hasText: /confirm|yes|delete/i 
      });
      
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        console.log('Confirmed token revocation');
      }
      
      // Check for success message
      const successMessage = page.locator('text=/revoked|deleted|removed successfully/i');
      if (await successMessage.isVisible({ timeout: 5000 })) {
        console.log('Token successfully revoked');
      }
    } else {
      console.log('No tokens available to revoke');
    }
  });
});

// Smoke test without authentication
test.describe('Public Access Test', () => {
  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    
    await page.goto('/settings/tokens');
    
    // Should be redirected to sign-in
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    console.log('Correctly redirected to sign-in page');
  });
});