import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * 生产环境 E2E 测试 - 防机器人检测版本
 */

// 工具函数：模拟人类行为
class HumanBehavior {
  static async randomDelay(min = 500, max = 2000) {
    await new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
  }

  static async typeSlowly(page: Page, selector: string, text: string) {
    await page.click(selector);
    for (const char of text) {
      await page.keyboard.type(char);
      await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
    }
  }

  static async randomMouseMovement(page: Page) {
    const x = Math.random() * 500 + 100;
    const y = Math.random() * 300 + 100;
    await page.mouse.move(x, y, { steps: 10 });
  }

  static async scrollRandomly(page: Page) {
    const scrollY = Math.random() * 300;
    await page.evaluate((y) => window.scrollBy(0, y), scrollY);
  }
}

test.describe('Production E2E - Anti-Bot Detection', () => {
  test.use({
    baseURL: 'https://app.uspark.ai',
    // 使用真实的浏览器设置
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // 不使用 headless 模式可能更不容易被检测
    // headless: false,  // 在 CI 中可能需要 headless
  });

  test.beforeEach(async ({ page }) => {
    // 添加一些真实的浏览器属性
    await page.addInitScript(() => {
      // 隐藏 webdriver 属性
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // 添加正常的浏览器属性
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      
      // 设置正确的语言
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });
  });

  test('login with anti-bot measures', async ({ page, context }) => {
    // 跳过如果没有配置
    test.skip(!process.env.E2E_PROD_EMAIL || !process.env.E2E_PROD_PASSWORD,
      'Production credentials not configured');

    // 1. 先访问主页，建立"正常"的浏览行为
    await page.goto('/');
    await HumanBehavior.randomDelay(1000, 3000);
    await HumanBehavior.scrollRandomly(page);
    
    // 2. 随机鼠标移动
    await HumanBehavior.randomMouseMovement(page);
    
    // 3. 点击登录链接（不是直接导航）
    const signInLink = page.locator('a[href="/sign-in"]').first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
    } else {
      await page.goto('/sign-in');
    }
    
    // 4. 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await HumanBehavior.randomDelay();
    
    // 5. 缓慢输入邮箱
    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.click();
    await HumanBehavior.randomDelay(500, 1000);
    await HumanBehavior.typeSlowly(page, 'input[name="identifier"]', process.env.E2E_PROD_EMAIL!);
    
    // 6. 人类般的停顿
    await HumanBehavior.randomDelay(500, 1500);
    
    // 7. 点击继续
    await page.click('button:has-text("Continue")');
    
    // 8. 等待密码字段
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await HumanBehavior.randomDelay(1000, 2000);
    
    // 9. 输入密码
    await HumanBehavior.typeSlowly(page, 'input[type="password"]', process.env.E2E_PROD_PASSWORD!);
    
    // 10. 再次停顿
    await HumanBehavior.randomDelay(500, 1000);
    
    // 11. 提交登录
    await page.click('button:has-text("Continue")');
    
    // 12. 等待登录完成
    try {
      await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
        timeout: 15000
      });
      console.log('✅ Successfully logged in');
    } catch (error) {
      // 检查是否遇到机器人检测
      const pageContent = await page.content();
      if (pageContent.includes('bot') || pageContent.includes('verify')) {
        console.log('⚠️  Bot detection triggered');
        throw new Error('Bot detection triggered - consider using staging environment');
      }
      throw error;
    }
    
    // 13. 测试功能（谨慎操作）
    await page.goto('/settings/tokens');
    await HumanBehavior.randomDelay();
    
    // 只验证页面加载，不执行写操作
    await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
    console.log('✅ Token page accessed successfully');
  });

  test('distributed test execution', async ({ page }) => {
    // 分散测试执行时间，避免集中访问
    const delayMinutes = Math.random() * 5;  // 0-5 分钟随机延迟
    console.log(`Waiting ${delayMinutes.toFixed(2)} minutes before test...`);
    await new Promise(r => setTimeout(r, delayMinutes * 60 * 1000));
    
    // 继续测试...
    await page.goto('/');
    await expect(page).toHaveTitle(/uSpark/);
  });
});

/**
 * 使用 Cookie 持久化避免重复登录
 */
test.describe('Session Persistence', () => {
  let authContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    // 只登录一次，保存会话
    authContext = await browser.newContext();
    const page = await authContext.newPage();
    
    // 执行登录（使用防机器人措施）
    await page.goto('https://app.uspark.ai/sign-in');
    await HumanBehavior.randomDelay();
    
    await HumanBehavior.typeSlowly(
      page, 
      'input[name="identifier"]', 
      process.env.E2E_PROD_EMAIL!
    );
    await page.click('button:has-text("Continue")');
    
    await page.waitForSelector('input[type="password"]');
    await HumanBehavior.typeSlowly(
      page,
      'input[type="password"]',
      process.env.E2E_PROD_PASSWORD!
    );
    await page.click('button:has-text("Continue")');
    
    await page.waitForURL((url) => !url.pathname.includes('sign-in'));
    
    // 保存认证状态
    await authContext.storageState({ path: 'playwright/.clerk/prod-auth.json' });
    await page.close();
  });

  test('use saved session', async () => {
    // 使用保存的会话，避免重复登录
    const page = await authContext.newPage();
    await page.goto('https://app.uspark.ai/settings/tokens');
    
    // 应该已经登录
    await expect(page).not.toHaveURL(/sign-in/);
    await page.close();
  });

  test.afterAll(async () => {
    await authContext.close();
  });
});