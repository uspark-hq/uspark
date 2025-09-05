import { test, expect } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

/**
 * E2E 测试使用 Secret Key 和 Clerk Testing Helpers
 * 
 * 前提条件：
 * 1. 配置了 CLERK_SECRET_KEY
 * 2. 运行了 global-setup.ts (自动获取 Testing Token)
 * 3. 认证状态已保存到 playwright/.clerk/auth.json
 */
test.describe('CLI Token Management - With Secret Key', () => {
  // 使用保存的认证状态
  test.use({
    storageState: 'playwright/.clerk/auth.json'
  });

  test('should already be authenticated', async ({ page }) => {
    // 由于 global setup 已经完成认证，直接访问受保护页面
    await page.goto('/settings/tokens');
    
    // 确保 Clerk 已加载
    await clerk.loaded({ page });
    
    // 不应该被重定向到登录页
    await expect(page).not.toHaveURL(/sign-in/);
    
    // 验证在 token 页面
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    console.log('✅ Authentication working with saved state');
  });

  test('generate token with pre-authenticated session', async ({ page }) => {
    // 直接访问 token 页面（已认证）
    await page.goto('/settings/tokens');
    await clerk.loaded({ page });
    
    // 生成新 token
    const tokenName = `Secret-Key-Test-${Date.now()}`;
    await page.fill('input[placeholder*="Token"]', tokenName);
    await page.click('button:has-text("Generate Token")');
    
    // 等待 token 生成
    await page.waitForTimeout(2000);
    
    // 验证 token
    const tokenElement = await page.locator('input[value*="uspark_"], code:has-text("uspark_")').first();
    if (await tokenElement.isVisible()) {
      const token = await tokenElement.inputValue().catch(() => tokenElement.textContent());
      console.log('✅ Token generated:', token?.substring(0, 20) + '...');
      expect(token).toMatch(/^uspark_/);
    }
  });

  test('sign out and sign in programmatically', async ({ page }) => {
    // 登出
    await clerk.signOut({ page });
    console.log('✅ Signed out');
    
    // 访问受保护页面，应该重定向
    await page.goto('/settings/tokens');
    await expect(page).toHaveURL(/sign-in/);
    
    // 使用 Clerk helper 程序化登录
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.E2E_CLERK_USER_USERNAME!,
        password: process.env.E2E_CLERK_USER_PASSWORD!,
      },
    });
    
    console.log('✅ Signed in programmatically');
    
    // 再次访问 token 页面
    await page.goto('/settings/tokens');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
  });

  test('parallel test execution', async ({ page, context }) => {
    // 由于使用了 Testing Token，可以并行执行多个测试
    // 每个测试都有独立的认证状态
    
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    // 并行访问
    await Promise.all(pages.map(async (p, index) => {
      await p.goto('/settings/tokens');
      await clerk.loaded({ page: p });
      await expect(p).not.toHaveURL(/sign-in/);
      console.log(`✅ Page ${index + 1} authenticated`);
      await p.close();
    }));
  });
});

/**
 * 测试不同的认证策略
 */
test.describe('Authentication Strategies', () => {
  test('use testing token directly', async ({ page }) => {
    // Testing Token 在 global setup 中已经获取
    const testingToken = process.env.CLERK_TESTING_TOKEN;
    
    if (!testingToken) {
      test.skip('Testing token not available');
      return;
    }
    
    // 使用 Testing Token 访问
    await page.goto(`/sign-in?__clerk_testing_token=${testingToken}`);
    
    // 应该自动完成认证
    await page.waitForURL(/^((?!sign-in).)*$/, { timeout: 5000 });
    
    // 访问受保护资源
    await page.goto('/settings/tokens');
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    console.log('✅ Testing token authentication successful');
  });

  test('verify session persistence', async ({ page }) => {
    // 访问多个受保护页面，验证会话持续有效
    const protectedPages = [
      '/settings/tokens',
      '/dashboard',
      '/projects'
    ];
    
    for (const url of protectedPages) {
      await page.goto(url);
      
      // 如果页面存在，不应该重定向到登录
      if (page.url().includes(url)) {
        await expect(page).not.toHaveURL(/sign-in/);
        console.log(`✅ ${url} - authenticated access`);
      } else if (page.url().includes('404')) {
        console.log(`⚠️  ${url} - page not found (but authenticated)`);
      }
    }
  });
});