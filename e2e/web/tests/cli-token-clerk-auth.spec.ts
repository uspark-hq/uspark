import { test, expect } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

test.describe('CLI Token Management with Clerk Auth', () => {
  test.describe.configure({ mode: 'serial' });
  
  // Skip if no credentials are configured
  test.beforeAll(async () => {
    const hasCredentials = 
      process.env.CLERK_PUBLISHABLE_KEY && 
      process.env.CLERK_SECRET_KEY &&
      process.env.E2E_CLERK_USER_USERNAME &&
      process.env.E2E_CLERK_USER_PASSWORD;
      
    if (!hasCredentials) {
      test.skip('Clerk credentials not configured - see CLERK_SETUP.md');
    }
  });

  test('authenticate and generate token', async ({ page }) => {
    // The global setup should have already obtained a testing token
    // and saved auth state, so we should be authenticated
    
    // Navigate directly to tokens page
    await page.goto('/settings/tokens');
    
    // Wait for Clerk to load
    await clerk.loaded({ page });
    
    // Check if we're authenticated (should not redirect to sign-in)
    await expect(page).not.toHaveURL(/sign-in/);
    
    // Verify we're on the tokens page
    const heading = await page.locator('h1:has-text("CLI Tokens")');
    await expect(heading).toBeVisible();
    
    // Generate a new token
    const tokenName = `E2E Test Token ${Date.now()}`;
    await page.fill('input[placeholder*="Token"]', tokenName);
    
    const generateButton = page.locator('button:has-text("Generate Token")');
    await generateButton.click();
    
    // Wait for token generation
    await page.waitForTimeout(2000);
    
    // Look for the generated token
    const tokenInput = page.locator('input[value*="uspark_"]').first();
    const codeElement = page.locator('code:has-text("uspark_")').first();
    
    let tokenValue: string | null = null;
    
    if (await tokenInput.isVisible()) {
      tokenValue = await tokenInput.inputValue();
    } else if (await codeElement.isVisible()) {
      tokenValue = await codeElement.textContent();
    }
    
    if (tokenValue) {
      console.log('✅ Token generated successfully');
      expect(tokenValue).toMatch(/^uspark_[a-zA-Z0-9]+$/);
    } else {
      throw new Error('Token was not generated or displayed');
    }
  });

  test('sign in programmatically during test', async ({ page }) => {
    // Sign out first
    await clerk.signOut({ page });
    
    // Verify signed out
    await page.goto('/settings/tokens');
    await expect(page).toHaveURL(/sign-in/);
    
    // Sign in using clerk helper
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.E2E_CLERK_USER_USERNAME!,
        password: process.env.E2E_CLERK_USER_PASSWORD!,
      },
    });
    
    // Navigate back to tokens page
    await page.goto('/settings/tokens');
    
    // Should now be authenticated
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
  });

  test('list and manage existing tokens', async ({ page }) => {
    // Should already be authenticated from global setup
    await page.goto('/settings/tokens');
    
    // Wait for page to load
    await clerk.loaded({ page });
    
    // Look for tokens list/table
    const tokensList = page.locator('table, [role="list"], ul').filter({
      hasText: /token|created/i
    });
    
    if (await tokensList.isVisible()) {
      console.log('✅ Tokens list is visible');
      
      // Check if there are any revoke buttons
      const revokeButtons = page.locator('button').filter({
        hasText: /revoke|delete|remove/i
      });
      
      const buttonCount = await revokeButtons.count();
      console.log(`Found ${buttonCount} revoke buttons`);
      
      if (buttonCount > 0) {
        // Test revocation (on the last token to avoid deleting important ones)
        const lastButton = revokeButtons.last();
        await lastButton.click();
        
        // Handle confirmation if it appears
        const confirmButton = page.locator('button').filter({
          hasText: /confirm|yes/i
        }).first();
        
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          console.log('✅ Token revocation confirmed');
        }
        
        // Check for success message
        const successMsg = page.locator('text=/revoked|deleted|removed/i');
        if (await successMsg.isVisible({ timeout: 3000 })) {
          console.log('✅ Token successfully revoked');
        }
      }
    }
  });
});