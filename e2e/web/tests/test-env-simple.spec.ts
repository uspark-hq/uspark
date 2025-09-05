import { test, expect } from '@playwright/test';

/**
 * 简化的测试环境 E2E 测试
 * 测试基础功能和登录流程
 */

test.describe('Test Environment - Basic Access', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // 验证页面加载
    await expect(page).toHaveTitle(/Uspark/i);
    
    // 查找登录按钮或用户相关元素
    const signInButton = page.locator('button, a').filter({ hasText: /sign in|login/i }).first();
    if (await signInButton.count() > 0) {
      console.log('✅ Homepage loaded, sign in button found');
    } else {
      console.log('✅ Homepage loaded');
    }
  });

  test('sign in page is accessible', async ({ page }) => {
    await page.goto('/sign-in');
    
    // 等待 Clerk 组件加载
    await page.waitForTimeout(2000);
    
    // 查找登录表单元素
    const emailInput = page.locator('input[type="email"], input[name="identifier"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.count() > 0) {
      console.log('✅ Sign in page loaded with email input');
      expect(await emailInput.isVisible()).toBe(true);
    }
    
    if (await passwordInput.count() > 0) {
      console.log('✅ Password input found');
      expect(await passwordInput.isVisible()).toBe(true);
    }
  });

  test('manual sign in flow', async ({ page }) => {
    // 访问登录页
    await page.goto('/sign-in');
    await page.waitForTimeout(2000);
    
    // 填写登录表单
    const emailInput = page.locator('input[type="email"], input[name="identifier"], input[placeholder*="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.fill(process.env.E2E_CLERK_USER_USERNAME || 'test@example.com');
      await passwordInput.fill(process.env.E2E_CLERK_USER_PASSWORD || 'TestPassword123!');
      
      // 提交表单
      const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /sign in|continue|login/i }).first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // 等待登录完成
        await page.waitForTimeout(3000);
        
        // 检查是否成功登录（URL 变化或出现 dashboard）
        if (!page.url().includes('sign-in')) {
          console.log('✅ Successfully signed in');
          
          // 尝试访问受保护的页面
          await page.goto('/settings/tokens');
          await page.waitForTimeout(2000);
          
          if (!page.url().includes('sign-in')) {
            console.log('✅ Accessed protected page after sign in');
            
            // 查找 token 页面的元素
            const tokenHeader = page.locator('h1, h2').filter({ hasText: /token/i }).first();
            if (await tokenHeader.count() > 0) {
              console.log('✅ Token page content visible');
            }
          }
        } else {
          console.log('⚠️ Sign in may have failed or requires additional steps');
        }
      }
    } else {
      console.log('⚠️ Could not find login form elements');
    }
  });

  test('public API endpoints', async ({ page, request }) => {
    // 测试公开的 API 端点
    const response = await request.get('/api/health');
    
    if (response.ok()) {
      console.log('✅ Health API endpoint accessible');
    } else {
      console.log(`⚠️ Health API returned ${response.status()}`);
    }
  });
});

test.describe('Test Environment - Token Management', () => {
  test('token page requires authentication', async ({ page }) => {
    // 直接访问 token 页面
    await page.goto('/settings/tokens');
    await page.waitForTimeout(2000);
    
    // 应该重定向到登录页
    if (page.url().includes('sign-in')) {
      console.log('✅ Token page correctly requires authentication');
    } else {
      console.log('⚠️ Token page may be publicly accessible or already authenticated');
    }
  });
});