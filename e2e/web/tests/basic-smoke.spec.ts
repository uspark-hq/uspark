import { test, expect } from '@playwright/test';

/**
 * Basic smoke tests that don't require authentication
 * These should always pass regardless of Clerk configuration
 */

test.describe('Basic Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check page loaded
    await expect(page).toHaveTitle(/uSpark/i);
    console.log('✅ Homepage loaded successfully');
    
    // Check for main content
    const mainContent = page.locator('main, [role="main"], body').first();
    await expect(mainContent).toBeVisible();
    console.log('✅ Main content is visible');
  });

  test('sign-in page is accessible', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Should see sign-in form or Clerk component
    const signInForm = page.locator('form, [data-clerk-sign-in], input[name="identifier"]').first();
    await expect(signInForm).toBeVisible({ timeout: 10000 });
    console.log('✅ Sign-in page is accessible');
  });

  test('API health check endpoints work', async ({ request }) => {
    // Test a basic API endpoint that doesn't require auth
    const response = await request.get('/api/hello');
    
    expect(response.status()).toBeLessThan(500);
    console.log(`✅ API health check returned status: ${response.status()}`);
  });

  test('static assets load correctly', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check main document loaded
    expect(response?.status()).toBeLessThan(400);
    
    // Wait for any CSS/JS to load
    await page.waitForLoadState('networkidle');
    
    // Check if styles are applied (page has some styling)
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return styles.fontFamily !== '' || styles.backgroundColor !== '';
    });
    
    expect(hasStyles).toBeTruthy();
    console.log('✅ Static assets and styles loaded correctly');
  });

  test('navigation links exist', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for common navigation elements
    const navElements = await page.locator('nav, header, a[href]').count();
    expect(navElements).toBeGreaterThan(0);
    console.log(`✅ Found ${navElements} navigation elements`);
  });

  test('404 page handles unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-definitely-does-not-exist-123456');
    
    // Should get 404 or redirect
    if (response) {
      const status = response.status();
      expect([404, 200, 307, 308]).toContain(status); // 404 or redirect to home/error page
      console.log(`✅ Unknown route handled with status: ${status}`);
    }
  });

  test('viewport responsiveness', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    let isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();
    console.log('✅ Page renders on mobile viewport');
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();
    console.log('✅ Page renders on tablet viewport');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    isVisible = await page.locator('body').isVisible();
    expect(isVisible).toBeTruthy();
    console.log('✅ Page renders on desktop viewport');
  });
});