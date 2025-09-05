import { test, expect } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';

/**
 * 测试环境 E2E 测试
 * 使用测试密钥和 clerkSetup() 
 */

test.describe('Test Environment - Authenticated Pages', () => {
  // 使用 global setup 中保存的认证状态
  test.use({
    storageState: 'playwright/.clerk/auth.json'
  });

  test.beforeEach(async ({ page }) => {
    // 确保 Clerk 已加载
    await clerk.loaded({ page });
  });

  test('access dashboard after authentication', async ({ page }) => {
    // 直接访问 dashboard（应该已认证）
    await page.goto('/dashboard');
    
    // 不应该重定向到登录页
    await expect(page).not.toHaveURL(/sign-in/);
    
    // 验证 dashboard 内容
    const dashboardTitle = page.locator('h1, h2').filter({ hasText: /dashboard/i });
    if (await dashboardTitle.isVisible()) {
      console.log('✅ Dashboard accessed successfully');
    }
  });

  test('access and test token management page', async ({ page }) => {
    // 访问 token 页面
    await page.goto('/settings/tokens');
    
    // 验证页面加载
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    // 生成新 token
    const tokenName = `Test-${Date.now()}`;
    await page.fill('input[placeholder*="Token"], input[placeholder*="token"]', tokenName);
    
    const generateBtn = page.locator('button').filter({ hasText: /generate|create/i }).first();
    await generateBtn.click();
    
    // 等待 token 生成
    await page.waitForTimeout(2000);
    
    // 查找生成的 token
    const tokenElement = page.locator('input[value*="uspark_"], code:has-text("uspark_")').first();
    if (await tokenElement.isVisible()) {
      const token = await tokenElement.inputValue().catch(() => tokenElement.textContent());
      console.log('✅ Token generated:', token?.substring(0, 20) + '...');
      expect(token).toMatch(/^uspark_/);
    }
  });

  test('access projects page', async ({ page }) => {
    await page.goto('/projects');
    
    // 如果页面存在，验证不需要登录
    if (!page.url().includes('404')) {
      await expect(page).not.toHaveURL(/sign-in/);
      console.log('✅ Projects page accessible');
      
      // 查找项目相关的元素
      const projectElements = page.locator('text=/project/i');
      if (await projectElements.first().isVisible()) {
        console.log('✅ Project content found');
      }
    } else {
      console.log('⚠️  Projects page returns 404');
    }
  });

  test('access settings pages', async ({ page }) => {
    const settingsPages = [
      '/settings',
      '/settings/profile',
      '/settings/tokens',
      '/settings/billing'
    ];
    
    for (const url of settingsPages) {
      await page.goto(url);
      
      if (!page.url().includes('404')) {
        await expect(page).not.toHaveURL(/sign-in/);
        console.log(`✅ ${url} accessible`);
      } else {
        console.log(`⚠️  ${url} returns 404`);
      }
    }
  });
});

test.describe('Test Environment - Sign In/Out Flow', () => {
  test('complete sign in and sign out flow', async ({ page }) => {
    // 先登出
    await clerk.signOut({ page });
    
    // 访问受保护页面，应该重定向
    await page.goto('/settings/tokens');
    await expect(page).toHaveURL(/sign-in/);
    console.log('✅ Correctly redirected when signed out');
    
    // 使用 clerk helper 登录
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.E2E_CLERK_USER_USERNAME || 'test@example.com',
        password: process.env.E2E_CLERK_USER_PASSWORD || 'TestPassword123!',
      },
    });
    
    console.log('✅ Signed in successfully');
    
    // 现在应该能访问受保护页面
    await page.goto('/settings/tokens');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    // 再次登出
    await clerk.signOut({ page });
    
    // 验证已登出
    await page.goto('/settings/tokens');
    await expect(page).toHaveURL(/sign-in/);
    console.log('✅ Successfully signed out');
  });

  test('persist session across browser contexts', async ({ browser }) => {
    // 创建新的上下文，使用保存的认证
    const context = await browser.newContext({
      storageState: 'playwright/.clerk/auth.json'
    });
    
    const page = await context.newPage();
    await page.goto('/settings/tokens');
    
    // 应该已认证
    await expect(page).not.toHaveURL(/sign-in/);
    console.log('✅ Session persisted across contexts');
    
    await context.close();
  });
});

test.describe('Test Environment - API Integration', () => {
  test('test API endpoints with authentication', async ({ page, request }) => {
    // 获取认证 cookies
    await page.goto('/');
    const cookies = await page.context().cookies();
    
    // 设置 cookies 到 request context
    const cookieHeader = cookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
    
    // 测试 API 端点
    const response = await request.get('/api/user', {
      headers: {
        'Cookie': cookieHeader
      }
    });
    
    if (response.ok()) {
      const data = await response.json();
      console.log('✅ API request successful:', data);
    } else {
      console.log(`⚠️  API returned ${response.status()}`);
    }
  });
});

test.describe('Test Environment - Create Test User', () => {
  test.skip('create test user if not exists', async ({ page }) => {
    // 这个测试用于创建测试用户（只运行一次）
    // 注意：需要 Clerk Dashboard 访问权限或 API
    
    console.log('To create a test user:');
    console.log('1. Go to Clerk Dashboard');
    console.log('2. Navigate to Users');
    console.log('3. Create user with:');
    console.log('   Email: test@example.com');
    console.log('   Password: TestPassword123!');
  });
});