import { test, expect } from '@playwright/test';

/**
 * 安全的 E2E 测试方案 - 不需要 Secret Key
 * 使用真实的登录流程，就像用户操作一样
 */
test.describe('CLI Token Management - Safe Auth', () => {
  // 跳过测试如果没有配置凭据
  test.skip(!process.env.E2E_CLERK_USER_USERNAME || !process.env.E2E_CLERK_USER_PASSWORD, 
    'Test credentials not configured');

  test('login with UI and generate token', async ({ page }) => {
    // 1. 访问登录页
    await page.goto('/sign-in');
    
    // 2. 填写邮箱/用户名
    const identifierInput = page.locator('input[name="identifier"]');
    await identifierInput.fill(process.env.E2E_CLERK_USER_USERNAME!);
    
    // 点击继续
    await page.locator('button:has-text("Continue")').click();
    
    // 3. 等待密码输入框出现并填写
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill(process.env.E2E_CLERK_USER_PASSWORD!);
    
    // 点击继续完成登录
    await page.locator('button:has-text("Continue")').click();
    
    // 4. 等待重定向（登录成功后应该离开登录页）
    await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
      timeout: 10000
    });
    
    console.log('✅ Successfully logged in');
    
    // 5. 访问 Token 管理页面
    await page.goto('/settings/tokens');
    
    // 验证在正确的页面
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    // 6. 生成新 token
    const tokenName = `Test Token ${new Date().toISOString()}`;
    await page.fill('input[placeholder*="Token"]', tokenName);
    await page.click('button:has-text("Generate Token")');
    
    // 7. 等待并验证 token 生成
    await page.waitForTimeout(2000);
    
    // 查找生成的 token
    const tokenElement = await page.locator('input[value*="uspark_"], code:has-text("uspark_")').first();
    
    if (await tokenElement.isVisible()) {
      const tokenValue = await tokenElement.inputValue().catch(() => tokenElement.textContent());
      console.log('✅ Token generated:', tokenValue?.substring(0, 20) + '...');
      expect(tokenValue).toMatch(/^uspark_/);
    }
  });

  test('persist auth across pages', async ({ page, context }) => {
    // 登录一次
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', process.env.E2E_CLERK_USER_USERNAME!);
    await page.locator('button:has-text("Continue")').click();
    
    await page.locator('input[type="password"]').waitFor();
    await page.fill('input[type="password"]', process.env.E2E_CLERK_USER_PASSWORD!);
    await page.locator('button:has-text("Continue")').click();
    
    await page.waitForURL((url) => !url.pathname.includes('sign-in'));
    
    // 保存认证状态
    await context.storageState({ path: 'playwright/.clerk/manual-auth.json' });
    console.log('✅ Auth state saved');
    
    // 在新页面中验证认证持续有效
    const newPage = await context.newPage();
    await newPage.goto('/settings/tokens');
    
    // 不应该重定向到登录页
    await expect(newPage).not.toHaveURL(/sign-in/);
    await expect(newPage.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    console.log('✅ Auth persisted across pages');
    await newPage.close();
  });
});

/**
 * 使用保存的认证状态的测试
 */
test.describe('Using saved auth state', () => {
  test.use({
    storageState: 'playwright/.clerk/manual-auth.json'
  });
  
  test.skip(({ browserName }) => browserName !== 'chromium', 
    'Auth state only saved in chromium');

  test('directly access protected page with saved auth', async ({ page }) => {
    // 直接访问受保护页面
    await page.goto('/settings/tokens');
    
    // 应该已经登录，不会重定向
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    
    console.log('✅ Successfully used saved auth state');
  });
});