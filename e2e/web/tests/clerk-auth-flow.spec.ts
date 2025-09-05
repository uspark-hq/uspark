import { test, expect } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

/**
 * Clerk 认证流程测试
 * 使用 Clerk Testing Token 测试认证流程
 */

test.describe('Clerk Authentication Flow', () => {
  test('complete sign-in flow using testing token', async ({ page }) => {
    console.log('🔐 Starting Clerk authentication test with testing token');
    
    // Use Clerk testing helpers to sign in
    // This bypasses the actual login UI and uses the testing token
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: 'test+clerk_test@example.com',
        password: 'clerk_test_password'
      }
    });
    
    console.log('✅ Signed in using Clerk testing token');
    
    // Verify we're authenticated by accessing a protected page
    await page.goto('/settings/tokens');
    await page.waitForLoadState('networkidle');
    
    // Should not be redirected to sign-in
    await expect(page).not.toHaveURL(/sign-in/);
    console.log('✅ Successfully accessed protected route');
    
    // Verify page content loads
    const pageContent = page.locator('main, [role="main"], #main-content').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    console.log('✅ Protected page content loaded');
    
    // Test sign out functionality
    await clerk.signOut({ page });
    console.log('✅ Signed out successfully');
    
    // Verify we're signed out by trying to access protected page again
    await page.goto('/settings/tokens');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to sign-in
    await expect(page).toHaveURL(/sign-in/);
    console.log('✅ Correctly redirected to sign-in after logout');
  });

  test('test user session persistence', async ({ page, context }) => {
    console.log('🔐 Testing session persistence');
    
    // Sign in with testing token
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: 'test+clerk_test@example.com',
        password: 'clerk_test_password'
      }
    });
    
    // Navigate to different pages and verify session persists
    const protectedRoutes = [
      '/settings/tokens',
      '/projects',
      '/'
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should not be redirected to sign-in
      await expect(page).not.toHaveURL(/sign-in/);
      console.log(`✅ Session persisted for route: ${route}`);
    }
    
    // Open a new page in the same context
    const newPage = await context.newPage();
    await newPage.goto('/settings/tokens');
    await newPage.waitForLoadState('networkidle');
    
    // Session should persist across pages in same context
    await expect(newPage).not.toHaveURL(/sign-in/);
    console.log('✅ Session persisted across browser tabs');
    
    await newPage.close();
  });
  
  test('test protected API endpoints with auth', async ({ page, request }) => {
    console.log('🔐 Testing protected API endpoints');
    
    // Sign in first
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: 'test+clerk_test@example.com',
        password: 'clerk_test_password'
      }
    });
    
    // Get cookies from the page context
    const cookies = await page.context().cookies();
    
    // Test protected API endpoint
    const response = await request.post('/api/cli/auth/generate-token', {
      headers: {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        name: 'Test Token from E2E'
      }
    });
    
    // Should get successful response when authenticated
    expect(response.status()).toBeLessThan(400);
    console.log(`✅ Protected API returned status: ${response.status()}`);
    
    // Sign out and try again
    await clerk.signOut({ page });
    
    // Clear cookies for clean test
    await page.context().clearCookies();
    
    // Try the same API without auth
    const unauthResponse = await request.post('/api/cli/auth/generate-token', {
      data: {
        name: 'Test Token from E2E'
      }
    });
    
    // Should get 401 or redirect when not authenticated
    expect(unauthResponse.status()).toBeGreaterThanOrEqual(400);
    console.log(`✅ Protected API correctly rejected unauthenticated request: ${unauthResponse.status()}`);
  });
});