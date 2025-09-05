import { test, expect } from '@playwright/test';

test('sign in using password method', async ({ page }) => {
  // 访问登录页
  await page.goto('/sign-in');
  await page.waitForTimeout(2000);
  
  // 输入邮箱
  const emailInput = page.locator('input[name="identifier"]');
  await emailInput.fill('test@example.com');
  console.log('✅ Entered email');
  
  // 点击继续
  const continueButton = page.locator('button').filter({ hasText: 'Continue' });
  await continueButton.click();
  console.log('✅ Clicked continue');
  
  // 等待页面加载
  await page.waitForTimeout(2000);
  
  // 点击 "Use another method" 链接
  const useAnotherMethod = page.locator('a').filter({ hasText: 'Use another method' });
  if (await useAnotherMethod.count() > 0) {
    await useAnotherMethod.click();
    console.log('✅ Clicked "Use another method"');
    await page.waitForTimeout(2000);
    
    // 查找可用的认证方法
    const methodButtons = await page.locator('button, [role="button"]').all();
    console.log(`\nFound ${methodButtons.length} method options:`);
    
    for (let i = 0; i < methodButtons.length; i++) {
      const button = methodButtons[i];
      const text = await button.textContent();
      if (text) {
        console.log(`  Option ${i+1}: "${text.trim()}"`);
        
        // 查找密码选项
        if (text.toLowerCase().includes('password')) {
          await button.click();
          console.log('✅ Selected password method');
          await page.waitForTimeout(2000);
          
          // 输入密码
          const passwordInput = page.locator('input[type="password"]');
          if (await passwordInput.count() > 0) {
            await passwordInput.fill('TestPassword123!');
            console.log('✅ Entered password');
            
            // 提交
            const submitButton = page.locator('button').filter({ hasText: /continue|sign in/i }).first();
            await submitButton.click();
            console.log('✅ Submitted credentials');
            
            // 等待登录
            await page.waitForTimeout(3000);
            
            // 检查结果
            if (!page.url().includes('sign-in')) {
              console.log('✅ Successfully signed in!');
              console.log('Redirected to:', page.url());
              
              // 测试访问受保护页面
              await page.goto('/settings/tokens');
              await page.waitForTimeout(2000);
              
              if (!page.url().includes('sign-in')) {
                console.log('✅ Successfully accessed protected /settings/tokens page');
                
                // 查找页面元素
                const pageTitle = await page.title();
                console.log('Page title:', pageTitle);
                
                // 查找 token 相关元素
                const tokenElements = await page.locator('text=/token/i').all();
                console.log(`Found ${tokenElements.length} token-related elements on page`);
              }
            } else {
              console.log('❌ Still on sign-in page');
              
              // 查找错误消息
              const errors = await page.locator('[role="alert"], [class*="error"]').all();
              for (const error of errors) {
                const text = await error.textContent();
                if (text) console.log('Error:', text);
              }
            }
          }
          break;
        }
      }
    }
  } else {
    console.log('❌ "Use another method" link not found');
    console.log('Current URL:', page.url());
    
    // 截图当前页面状态
    await page.screenshot({ path: 'auth-state.png' });
    console.log('📸 Screenshot saved as auth-state.png');
  }
});