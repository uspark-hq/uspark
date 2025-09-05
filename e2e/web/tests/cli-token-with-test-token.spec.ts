import { test, expect } from '@playwright/test';

// 方法3: 使用 Clerk Testing Token（最稳定）
test.describe('Token Management with Clerk Test Token', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: []
    }
  });

  test('login with Clerk testing token', async ({ page }) => {
    // Clerk Testing Token 需要从 Clerk Dashboard 获取
    // Dashboard -> Settings -> API Keys -> Testing tokens
    const testingToken = process.env.CLERK_TEST_TOKEN || 'test_token_xxx';
    
    // 使用 testing token 直接登录
    await page.goto(`/sign-in#__clerk_testing_token=${testingToken}`);
    
    // 应该自动完成认证并重定向
    await page.waitForURL(/^((?!sign-in).)*$/, { timeout: 10000 });
    
    // 现在已登录，访问 token 页面
    await page.goto('/settings/tokens');
    
    // 验证页面可访问
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    // 生成 token
    await page.fill('input[placeholder*="Token"]', 'E2E Test Token');
    await page.click('button:has-text("Generate Token")');
    
    // 等待 token 显示
    await page.waitForTimeout(2000);
    
    // 查找 token
    const tokenElement = await page.locator('input[value*="uspark_"], code:has-text("uspark_")').first();
    if (await tokenElement.isVisible()) {
      const tokenValue = await tokenElement.inputValue().catch(() => tokenElement.textContent());
      console.log('Token generated successfully:', tokenValue?.substring(0, 15) + '...');
    }
  });
});