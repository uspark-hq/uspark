# Clerk 机器人检测解决方案

## 🚨 问题：Bot Traffic Detected

在生产环境运行 E2E 测试时，Clerk 可能会显示：
- "Bot traffic detected"
- "Verify you are human"
- CAPTCHA 挑战

## 🛡️ 解决方案（按推荐顺序）

### 方案 1：使用 Staging 环境（最推荐）

创建一个与生产环境相同配置但独立的 Staging 环境：

```typescript
// staging.config.ts
export default defineConfig({
  use: {
    baseURL: 'https://staging.uspark.ai',
  },
  globalSetup: './playwright/global-setup.ts', // Staging 可以用 clerkSetup
});
```

**优势：**
- ✅ 可以使用 `clerkSetup()` 和 Testing Token
- ✅ 绕过机器人检测
- ✅ 不影响生产数据

### 方案 2：请求 Clerk 白名单（适合企业）

联系 Clerk 支持团队，请求将测试 IP 加入白名单：

1. 在 Clerk Dashboard 提交支持票据
2. 提供信息：
   - 测试运行的 IP 地址（CI/CD 服务器）
   - 测试账户邮箱
   - 测试频率和时间

```yaml
# 使用固定 IP 的 CI Runner
jobs:
  e2e:
    runs-on: [self-hosted, production-testing]  # 固定 IP
```

### 方案 3：模拟真实用户行为

```typescript
// human-like-test.spec.ts
import { test, expect, Page } from '@playwright/test';

// 模拟人类行为的辅助函数
async function humanLikeDelay() {
  await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
}

async function humanLikeTyping(page: Page, selector: string, text: string) {
  await page.click(selector);
  for (const char of text) {
    await page.keyboard.type(char);
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
  }
}

test('production test with human-like behavior', async ({ page }) => {
  // 1. 设置真实的浏览器环境
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  // 2. 添加真实的 User Agent
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  // 3. 访问首页先"预热"
  await page.goto('https://app.uspark.ai');
  await humanLikeDelay();
  
  // 4. 缓慢导航到登录页
  await page.click('a[href="/sign-in"]');
  await page.waitForLoadState('networkidle');
  await humanLikeDelay();
  
  // 5. 人类般地输入
  await humanLikeTyping(page, 'input[name="identifier"]', process.env.E2E_EMAIL!);
  await humanLikeDelay();
  
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(1000);
  
  await humanLikeTyping(page, 'input[type="password"]', process.env.E2E_PASSWORD!);
  await humanLikeDelay();
  
  await page.click('button:has-text("Continue")');
  
  // 6. 随机鼠标移动
  await page.mouse.move(100, 100);
  await page.mouse.move(200, 200, { steps: 10 });
});
```

### 方案 4：使用 Playwright Stealth 插件

```bash
npm install playwright-extra puppeteer-extra-plugin-stealth
```

```typescript
// stealth-test.spec.ts
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());

test('stealth mode test', async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Stealth 插件会自动：
  // - 隐藏 webdriver 属性
  // - 模拟真实浏览器指纹
  // - 添加正常的浏览器行为
  
  await page.goto('https://app.uspark.ai/sign-in');
  // ... 继续测试
});
```

### 方案 5：降低测试频率

```yaml
# .github/workflows/e2e-production.yml
name: Production E2E

on:
  schedule:
    # 每天只运行一次，避免触发机器人检测
    - cron: '0 3 * * *'  # 凌晨 3 点
  workflow_dispatch:  # 手动触发

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 1  # 串行执行，不并发
    steps:
      - name: Run E2E with delays
        run: |
          npm run test:production -- --workers=1  # 单线程
```

### 方案 6：使用专用测试账户配置

在 Clerk Dashboard 为测试账户设置特殊配置：

1. 登录 Clerk Dashboard
2. 找到测试用户
3. 添加 metadata：
```json
{
  "public_metadata": {
    "is_e2e_test_account": true
  }
}
```
4. 请求 Clerk 支持对这些账户降低机器人检测敏感度

## 🎯 最佳实践组合

### 开发阶段
```typescript
// 本地和 CI：使用 clerkSetup()
if (process.env.NODE_ENV !== 'production') {
  await clerkSetup();  // 自动处理 Testing Token
}
```

### Staging 阶段
```typescript
// Staging：也可以用 clerkSetup()
await clerkSetup();  // 使用 staging 的 secret key
```

### 生产阶段
```typescript
// 生产：组合多种技术
test('production safe test', async ({ page }) => {
  // 1. 使用 stealth 模式
  // 2. 添加人类行为延迟
  // 3. 使用白名单 IP
  // 4. 降低运行频率
  // 5. 使用专用测试账户
});
```

## 📊 方案对比

| 方案 | 复杂度 | 可靠性 | 推荐场景 |
|-----|-------|-------|---------|
| Staging 环境 | 低 | 高 | ⭐ 首选 |
| IP 白名单 | 中 | 高 | 企业客户 |
| 人类行为模拟 | 高 | 中 | 临时方案 |
| Stealth 插件 | 中 | 中 | 辅助方案 |
| 降低频率 | 低 | 中 | 补充方案 |

## 🚀 推荐的完整解决方案

1. **主要测试在 Staging 环境**（95% 的测试）
2. **生产环境只做关键路径烟雾测试**（5% 的测试）
3. **生产测试使用**：
   - 专用测试账户
   - 人类行为模拟
   - 降低运行频率
   - 请求 IP 白名单（如果频繁测试）

## 🔧 实施步骤

1. **立即可做**：降低测试频率 + 人类行为模拟
2. **短期目标**：搭建 Staging 环境
3. **长期目标**：与 Clerk 建立企业关系，获得白名单支持