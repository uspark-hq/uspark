import { chromium } from '@playwright/test';

/**
 * 一次性脚本：登录并保存认证状态
 * 运行: npx ts-node auth/save-auth.ts
 */
async function saveAuthState() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 手动登录
  await page.goto('https://app.uspark.ai/sign-in');
  
  console.log('Please login manually in the browser...');
  console.log('After login, press Enter here to save auth state');
  
  // 等待用户手动登录
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
  
  // 保存认证状态
  await context.storageState({ path: 'auth/auth.json' });
  
  console.log('Auth state saved to auth/auth.json');
  await browser.close();
}

saveAuthState();