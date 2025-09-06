# E2E 测试环境策略

## 🎯 核心原则

**`clerkSetup()` 只能用于开发和测试环境，绝不能用于生产环境！**

## 📊 环境对照表

| 环境 | URL | 可以用 clerkSetup()? | Secret Key | 测试方法 |
|-----|-----|---------------------|------------|----------|
| **本地开发** | localhost:3000 | ✅ 可以 | sk_test_dev_xxx | clerkSetup() + helpers |
| **CI/CD** | localhost:3000 | ✅ 可以 | sk_test_dev_xxx | clerkSetup() + helpers |
| **Staging** | staging.uspark.ai | ✅ 可以 | sk_test_staging_xxx | clerkSetup() + helpers |
| **生产** | app.uspark.ai | ❌ **绝不！** | ❌ 不使用 | UI 登录 + 测试账户 |

## 🔧 实际配置示例

### 1. 开发环境（可以用 clerkSetup）

```typescript
// playwright.config.ts - 开发环境
export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
  },
  globalSetup: './playwright/global-setup.ts', // ✅ 使用 clerkSetup
});

// .env.local
CLERK_SECRET_KEY=sk_test_dev_xxx  // ✅ 测试密钥
```

### 2. Staging 环境（可以用 clerkSetup）

```typescript
// playwright.config.staging.ts
export default defineConfig({
  use: {
    baseURL: 'https://staging.uspark.ai',
  },
  globalSetup: './playwright/global-setup.ts', // ✅ 使用 clerkSetup
});

// .env.staging
CLERK_SECRET_KEY=sk_test_staging_xxx  // ✅ Staging 密钥
```

### 3. 生产环境（不能用 clerkSetup）

```typescript
// playwright.config.production.ts
export default defineConfig({
  use: {
    baseURL: 'https://app.uspark.ai',
  },
  // ❌ 不使用 globalSetup
  // ❌ 不调用 clerkSetup()
});

// .env.production
# ❌ 不配置 CLERK_SECRET_KEY
E2E_PROD_EMAIL=test@company.com
E2E_PROD_PASSWORD=TestPassword123
```

## 📝 生产环境测试代码

### ❌ 错误示范（不要这样做）

```typescript
// 不要在生产环境这样做！
import { clerkSetup } from '@clerk/testing/playwright';

test.beforeAll(async () => {
  // ❌ 这需要生产 Secret Key - 极度危险！
  await clerkSetup(); 
});
```

### ✅ 正确示范

```typescript
// production.spec.ts - 生产环境测试
test('production test', async ({ page }) => {
  // ✅ 使用真实的 UI 登录流程
  await page.goto('https://app.uspark.ai/sign-in');
  await page.fill('input[name="identifier"]', process.env.E2E_PROD_EMAIL!);
  await page.click('button:has-text("Continue")');
  await page.fill('input[type="password"]', process.env.E2E_PROD_PASSWORD!);
  await page.click('button:has-text("Continue")');
  
  // 测试功能...
});
```

## 🏗️ CI/CD 配置

### 开发/Staging 测试（可以用 Secret）

```yaml
- name: Run Staging Tests
  env:
    CLERK_SECRET_KEY: ${{ secrets.CLERK_STAGING_SECRET_KEY }}
  run: |
    npm run test:staging  # 使用 clerkSetup()
```

### 生产测试（不用 Secret）

```yaml
- name: Run Production Tests
  env:
    E2E_PROD_EMAIL: ${{ secrets.E2E_PROD_EMAIL }}
    E2E_PROD_PASSWORD: ${{ secrets.E2E_PROD_PASSWORD }}
    # 注意：没有 CLERK_SECRET_KEY！
  run: |
    npm run test:production  # 不使用 clerkSetup()
```

## 🎭 Clerk Dashboard 应用设置

理想情况下，在 Clerk Dashboard 创建多个应用：

1. **Development App**
   - Domain: localhost:3000
   - Purpose: 开发测试
   - Keys: pk_test_dev / sk_test_dev

2. **Staging App**
   - Domain: staging.uspark.ai
   - Purpose: 预发布测试
   - Keys: pk_test_stg / sk_test_stg

3. **Production App**
   - Domain: app.uspark.ai
   - Purpose: 真实用户
   - Keys: pk_live / sk_live
   - **E2E 测试：只用测试账户，不用 Secret Key！**

## 🔴 记住

- `clerkSetup()` = 需要 Secret Key
- 生产 Secret Key = 绝对不能在 E2E 中使用
- **因此：生产 E2E 不能用 `clerkSetup()`**