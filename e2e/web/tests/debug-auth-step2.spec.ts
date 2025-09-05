import { test, expect } from '@playwright/test';

test('debug second step of auth', async ({ page }) => {
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
  
  // 等待页面变化
  await page.waitForTimeout(3000);
  
  // 截图第二步
  await page.screenshot({ path: 'signin-step2.png', fullPage: true });
  console.log('📸 Screenshot saved as signin-step2.png');
  
  // 查找所有输入框
  const allInputs = await page.locator('input').all();
  console.log(`\nFound ${allInputs.length} input fields:`);
  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i];
    const type = await input.getAttribute('type');
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    console.log(`  Input ${i+1}: type="${type}" name="${name}" placeholder="${placeholder}"`);
  }
  
  // 查找错误消息
  const errors = await page.locator('[role="alert"], .error, [class*="error"], [class*="Error"]').all();
  console.log(`\nFound ${errors.length} error elements:`);
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    const text = await error.textContent();
    console.log(`  Error ${i+1}: "${text?.trim()}"`);
  }
  
  // 查找所有按钮
  const buttons = await page.locator('button').all();
  console.log(`\nFound ${buttons.length} buttons:`);
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const text = await button.textContent();
    console.log(`  Button ${i+1}: "${text?.trim()}"`);
  }
  
  // 查找所有链接
  const links = await page.locator('a').all();
  console.log(`\nFound ${links.length} links:`);
  for (let i = 0; i < Math.min(5, links.length); i++) {
    const link = links[i];
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`  Link ${i+1}: "${text?.trim()}" -> ${href}`);
  }
  
  // 检查URL变化
  console.log(`\nCurrent URL: ${page.url()}`);
});