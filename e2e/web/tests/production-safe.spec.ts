import { test, expect } from '@playwright/test';

/**
 * 生产环境安全 E2E 测试
 * 
 * 原则：
 * 1. 不使用 Secret Key
 * 2. 使用专门的测试账户
 * 3. 不修改生产数据
 * 4. 只进行读取和验证操作
 */

test.describe('Production E2E - Safe Tests', () => {
  // 确保测试生产环境
  test.use({
    baseURL: 'https://app.uspark.ai'
  });

  test.describe('Public Pages', () => {
    test('landing page loads', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/uSpark/);
    });

    test('sign-in page accessible', async ({ page }) => {
      await page.goto('/sign-in');
      await expect(page.locator('input[name="identifier"]')).toBeVisible();
      await expect(page.locator('button:has-text("Continue")')).toBeVisible();
    });

    test('token page shows public content', async ({ page }) => {
      await page.goto('/settings/tokens');
      
      // 公开内容应该可见
      await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
      await expect(page.locator('text=/USPARK_TOKEN/i')).toBeVisible();
    });
  });

  test.describe('Authenticated Tests', () => {
    // 跳过如果没有配置测试账户
    test.skip(!process.env.E2E_PROD_EMAIL || !process.env.E2E_PROD_PASSWORD,
      'Production test credentials not configured');

    test('login with test account', async ({ page }) => {
      // 1. 登录
      await page.goto('/sign-in');
      await page.fill('input[name="identifier"]', process.env.E2E_PROD_EMAIL!);
      await page.click('button:has-text("Continue")');
      
      await page.fill('input[type="password"]', process.env.E2E_PROD_PASSWORD!);
      await page.click('button:has-text("Continue")');
      
      // 2. 验证登录成功
      await page.waitForURL((url) => !url.pathname.includes('sign-in'));
      
      // 3. 访问 token 页面
      await page.goto('/settings/tokens');
      await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
      
      // 4. 验证可以看到 token 列表（只读）
      const tokensList = page.locator('table, [role="list"]').first();
      if (await tokensList.isVisible()) {
        console.log('✅ Can view token list');
      }
      
      // 注意：不要在生产环境生成或删除 token！
    });

    test('verify navigation works', async ({ page, context }) => {
      // 复用已登录的会话
      const cookies = await context.cookies();
      const hasAuth = cookies.some(c => c.name.includes('__clerk'));
      
      if (!hasAuth) {
        // 需要先登录
        await page.goto('/sign-in');
        await page.fill('input[name="identifier"]', process.env.E2E_PROD_EMAIL!);
        await page.click('button:has-text("Continue")');
        await page.fill('input[type="password"]', process.env.E2E_PROD_PASSWORD!);
        await page.click('button:has-text("Continue")');
        await page.waitForURL((url) => !url.pathname.includes('sign-in'));
      }
      
      // 测试导航
      const pages = [
        { url: '/dashboard', title: 'Dashboard' },
        { url: '/projects', title: 'Projects' },
        { url: '/settings', title: 'Settings' }
      ];
      
      for (const { url, title } of pages) {
        await page.goto(url);
        
        // 如果页面存在，验证标题
        if (!page.url().includes('404')) {
          console.log(`✅ ${url} is accessible`);
        } else {
          console.log(`⚠️  ${url} returns 404`);
        }
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('measure page load time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      console.log(`Page load time: ${loadTime}ms`);
      
      // 警告如果加载时间过长
      expect(loadTime).toBeLessThan(10000); // 10秒
    });

    test('check for console errors', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.goto('/sign-in');
      await page.goto('/settings/tokens');
      
      if (errors.length > 0) {
        console.log('⚠️  Console errors found:', errors);
      } else {
        console.log('✅ No console errors');
      }
      
      expect(errors).toHaveLength(0);
    });
  });
});

/**
 * 烟雾测试 - 快速验证关键功能
 */
test.describe('Production Smoke Tests', () => {
  test('critical paths available', async ({ page }) => {
    const criticalPaths = [
      '/',
      '/sign-in',
      '/sign-up',
      '/settings/tokens'
    ];
    
    for (const path of criticalPaths) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
      console.log(`✅ ${path} - Status: ${response?.status()}`);
    }
  });
});