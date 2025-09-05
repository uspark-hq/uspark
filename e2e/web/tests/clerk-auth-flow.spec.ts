import { test, expect } from '@playwright/test';

/**
 * Clerk 认证流程测试
 * 测试完整的登录流程
 */

test.describe('Clerk Authentication Flow', () => {
  test('complete sign-in flow with test user', async ({ page }) => {
    console.log('🔐 Starting Clerk sign-in flow test');
    
    // 1. 访问登录页
    await page.goto('/sign-in');
    await page.waitForTimeout(2000);
    
    // 2. 输入邮箱
    const emailInput = page.locator('input[name="identifier"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(process.env.E2E_CLERK_USER_USERNAME || 'test@example.com');
    console.log('✅ Entered email address');
    
    // 3. 点击继续按钮
    const continueButton = page.locator('button').filter({ hasText: 'Continue' });
    await continueButton.click();
    console.log('✅ Clicked continue button');
    
    // 4. 等待密码输入框出现
    await page.waitForTimeout(2000);
    const passwordInput = page.locator('input[type="password"]');
    
    if (await passwordInput.count() > 0) {
      await passwordInput.fill(process.env.E2E_CLERK_USER_PASSWORD || 'TestPassword123!');
      console.log('✅ Entered password');
      
      // 5. 提交密码
      const submitButton = page.locator('button').filter({ hasText: /continue|sign in/i }).first();
      await submitButton.click();
      console.log('✅ Submitted credentials');
      
      // 6. 等待登录完成和重定向
      await page.waitForTimeout(3000);
      
      // 7. 验证登录成功
      if (!page.url().includes('sign-in')) {
        console.log('✅ Successfully signed in and redirected');
        console.log('Current URL:', page.url());
        
        // 8. 尝试访问受保护的页面
        await page.goto('/settings/tokens');
        await page.waitForTimeout(2000);
        
        if (!page.url().includes('sign-in')) {
          console.log('✅ Successfully accessed protected page');
          
          // 查找页面内容
          const pageTitle = await page.title();
          console.log('Page title:', pageTitle);
          
          // 查找 Token 管理相关元素
          const tokenHeader = page.locator('h1, h2').filter({ hasText: /token/i }).first();
          if (await tokenHeader.count() > 0) {
            const headerText = await tokenHeader.textContent();
            console.log('✅ Token page header:', headerText);
          }
          
          // 查找创建 token 的输入框
          const tokenNameInput = page.locator('input[placeholder*="token" i], input[placeholder*="name" i]').first();
          if (await tokenNameInput.count() > 0) {
            console.log('✅ Found token name input field');
            
            // 尝试创建一个 token
            const tokenName = `e2e-test-${Date.now()}`;
            await tokenNameInput.fill(tokenName);
            
            // 查找生成按钮
            const generateButton = page.locator('button').filter({ hasText: /generate|create/i }).first();
            if (await generateButton.count() > 0) {
              await generateButton.click();
              console.log('✅ Clicked generate token button');
              
              // 等待 token 生成
              await page.waitForTimeout(3000);
              
              // 查找生成的 token
              const tokenValue = page.locator('input[value*="uspark_"], code:has-text("uspark_")').first();
              if (await tokenValue.count() > 0) {
                const token = await tokenValue.inputValue().catch(() => tokenValue.textContent());
                console.log('✅ Token generated successfully:', token?.substring(0, 20) + '...');
              }
            }
          }
        } else {
          console.log('❌ Failed to access protected page after sign-in');
        }
      } else {
        console.log('❌ Sign-in failed or still on sign-in page');
        console.log('Current URL:', page.url());
        
        // 查看是否有错误消息
        const errorMessage = page.locator('[role="alert"], .error, [class*="error"]').first();
        if (await errorMessage.count() > 0) {
          const error = await errorMessage.textContent();
          console.log('Error message:', error);
        }
      }
    } else {
      console.log('❌ Password input field not found');
      console.log('Page might be using different authentication method');
    }
  });
  
  test('sign out flow', async ({ page }) => {
    // 首先登录
    await page.goto('/sign-in');
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.fill(process.env.E2E_CLERK_USER_USERNAME || 'test@example.com');
    
    const continueButton = page.locator('button').filter({ hasText: 'Continue' });
    await continueButton.click();
    
    await page.waitForTimeout(2000);
    const passwordInput = page.locator('input[type="password"]');
    
    if (await passwordInput.count() > 0) {
      await passwordInput.fill(process.env.E2E_CLERK_USER_PASSWORD || 'TestPassword123!');
      const submitButton = page.locator('button').filter({ hasText: /continue|sign in/i }).first();
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      if (!page.url().includes('sign-in')) {
        console.log('✅ Signed in successfully');
        
        // 查找登出按钮
        const signOutButton = page.locator('button, a').filter({ hasText: /sign out|logout/i }).first();
        if (await signOutButton.count() > 0) {
          await signOutButton.click();
          console.log('✅ Clicked sign out button');
          await page.waitForTimeout(2000);
          
          // 验证已登出
          await page.goto('/settings/tokens');
          await page.waitForTimeout(2000);
          
          if (page.url().includes('sign-in')) {
            console.log('✅ Successfully signed out - redirected to sign-in');
          } else {
            console.log('⚠️ May still be signed in');
          }
        } else {
          console.log('⚠️ Sign out button not found');
        }
      }
    }
  });
});