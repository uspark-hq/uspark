import { test, expect } from '@playwright/test';

test.describe('Debug Sign-In Page', () => {
  test('capture sign-in page state', async ({ page }) => {
    // 访问登录页
    await page.goto('/sign-in');
    
    // 等待页面完全加载
    await page.waitForTimeout(5000);
    
    // 截图
    await page.screenshot({ path: 'signin-page.png', fullPage: true });
    console.log('📸 Screenshot saved as signin-page.png');
    
    // 获取页面HTML
    const html = await page.content();
    console.log('HTML length:', html.length);
    
    // 查找所有input元素
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input elements`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      console.log(`Input ${i + 1}: type="${type}" name="${name}" placeholder="${placeholder}" id="${id}"`);
    }
    
    // 查找所有button元素
    const buttons = await page.locator('button').all();
    console.log(`\nFound ${buttons.length} button elements`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      console.log(`Button ${i + 1}: "${text?.trim()}" type="${type}"`);
    }
    
    // 查找Clerk组件
    const clerkElements = await page.locator('[data-clerk-id], [class*="clerk"], [id*="clerk"]').all();
    console.log(`\nFound ${clerkElements.length} Clerk-related elements`);
    
    // 检查是否有iframe
    const iframes = await page.locator('iframe').all();
    console.log(`\nFound ${iframes.length} iframes`);
    
    if (iframes.length > 0) {
      for (let i = 0; i < iframes.length; i++) {
        const frame = iframes[i];
        const src = await frame.getAttribute('src');
        const id = await frame.getAttribute('id');
        console.log(`Iframe ${i + 1}: src="${src}" id="${id}"`);
      }
    }
  });
});