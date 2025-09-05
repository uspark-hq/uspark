import { test, expect } from '@playwright/test';

// 方法1: 使用真实账户登录
test.describe('Token Management with Real Login', () => {
  test('login with email and password', async ({ page }) => {
    // 1. 访问登录页
    await page.goto('/sign-in');
    
    // 2. 填写邮箱
    await page.fill('input[name="identifier"]', 'your-test@example.com');
    await page.click('button:has-text("Continue")');
    
    // 3. 填写密码
    await page.fill('input[type="password"]', 'your-password');
    await page.click('button:has-text("Continue")');
    
    // 4. 等待登录完成
    await page.waitForURL(/^((?!sign-in).)*$/);
    
    // 5. 现在可以访问需要认证的页面
    await page.goto('/settings/tokens');
    
    // 6. 生成 token
    await page.fill('input[placeholder*="Token"]', 'Test Token');
    await page.click('button:has-text("Generate Token")');
    
    // 验证 token 生成成功
    const tokenElement = await page.locator('text=/uspark_/');
    await expect(tokenElement).toBeVisible();
  });
});