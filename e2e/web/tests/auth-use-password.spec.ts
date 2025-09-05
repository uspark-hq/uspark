import { test, expect } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

test('sign in using clerk testing token', async ({ page }) => {
  // Use Clerk testing token to bypass authentication
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: 'test+clerk_test@example.com',
      password: 'clerk_test_password'
    }
  });
  
  console.log('✅ Signed in using Clerk testing token');
  
  // Now test accessing protected pages
  await page.goto('/settings/tokens');
  await page.waitForLoadState('networkidle');
  
  // Check if we successfully accessed the protected page
  await expect(page).not.toHaveURL(/sign-in/);
  console.log('✅ Successfully accessed protected /settings/tokens page');
  
  // Verify page content
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  
  // Check for token-related elements
  const tokenElements = page.locator('text=/token/i');
  await expect(tokenElements.first()).toBeVisible({ timeout: 5000 });
  console.log('✅ Token page content is visible');
});