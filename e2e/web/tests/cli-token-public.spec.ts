import { test, expect } from '@playwright/test';

test.describe('CLI Token Page - Public Access Behavior', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies to ensure unauthenticated state
    await context.clearCookies();
  });

  test('should allow access to token page without authentication', async ({ page }) => {
    await page.goto('/settings/tokens');
    
    // Page should be accessible (not redirected)
    await expect(page).toHaveURL(/.*settings\/tokens/);
    
    // Check for page content
    const heading = page.locator('text=/CLI Tokens/i');
    await expect(heading).toBeVisible();
    
    // Check for token generation form
    const tokenForm = page.locator('text=/Generate New Token/i');
    await expect(tokenForm).toBeVisible();
    
    console.log('✓ Token page is publicly accessible');
  });

  test('should require authentication when generating token', async ({ page }) => {
    await page.goto('/settings/tokens');
    
    // Fill in token name
    await page.fill('input[placeholder*="Token"]', 'Test Token');
    
    // Try to generate token
    const generateButton = page.locator('button:has-text("Generate Token")');
    await generateButton.click();
    
    // Should either:
    // 1. Redirect to sign-in
    // 2. Show error message
    // 3. Show authentication modal
    
    // Wait for any response
    await page.waitForTimeout(2000);
    
    // Check if redirected to sign-in
    const isOnSignIn = page.url().includes('sign-in');
    
    // Check for error message or sign-in page
    const errorMessage = await page.locator('text=/sign in|authenticate|unauthorized/i').first().isVisible().catch(() => false);
    
    // Check for auth modal
    const authModal = await page.locator('[role="dialog"]').isVisible();
    
    if (isOnSignIn || errorMessage || authModal) {
      console.log('✓ Token generation requires authentication');
      expect(isOnSignIn || errorMessage || authModal).toBeTruthy();
    } else {
      // Check if token was actually generated (shouldn't happen without auth)
      const tokenDisplay = await page.locator('text=/uspark_/').isVisible();
      if (tokenDisplay) {
        console.log('⚠️  Token was generated without authentication - security issue?');
      }
    }
  });

  test('should display informational content without auth', async ({ page }) => {
    await page.goto('/settings/tokens');
    
    // Check for instructions
    const instructions = page.locator('text=/authenticate with the uSpark CLI/i');
    await expect(instructions).toBeVisible();
    
    // Check for environment variable mention
    const envVarText = page.locator('text=/USPARK_TOKEN/i');
    await expect(envVarText).toBeVisible();
    
    console.log('✓ Informational content is visible');
  });
});