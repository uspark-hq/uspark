# 生产环境 E2E 测试设置

## ⚠️ 重要原则

**永远不要在 E2E 测试中使用生产环境的 Secret Key！**

## 🔐 推荐方案

### 方案 1：专用测试账户（最推荐）

在生产环境创建专门的 E2E 测试账户：

```env
# .env.production.e2e
BASE_URL=https://app.uspark.ai
E2E_TEST_EMAIL=e2e.test@yourcompany.com  # 专用测试邮箱
E2E_TEST_PASSWORD=ComplexPassword123!     # 强密码
# 不需要 CLERK_SECRET_KEY！
```

**测试代码：**
```typescript
test('production e2e test', async ({ page }) => {
  // 使用真实的登录流程
  await page.goto('https://app.uspark.ai/sign-in');
  await page.fill('input[name="identifier"]', process.env.E2E_TEST_EMAIL);
  await page.click('button:has-text("Continue")');
  await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD);
  await page.click('button:has-text("Continue")');
  
  // 测试功能
  await page.goto('/settings/tokens');
  // ...
});
```

### 方案 2：使用 Staging 环境（如果有）

如果有独立的 staging 环境：

```env
# .env.staging
BASE_URL=https://staging.uspark.ai
CLERK_PUBLISHABLE_KEY=pk_test_staging_xxx
CLERK_SECRET_KEY=sk_test_staging_xxx  # Staging 的密钥，不是生产！
E2E_CLERK_USER_USERNAME=test@staging.com
E2E_CLERK_USER_PASSWORD=StagingPassword123
```

### 方案 3：只读测试（最安全）

只测试公开页面和只读功能：

```typescript
test('production read-only tests', async ({ page }) => {
  // 测试公开页面
  await page.goto('https://app.uspark.ai');
  await expect(page).toHaveTitle(/uSpark/);
  
  // 测试登录页面存在
  await page.goto('https://app.uspark.ai/sign-in');
  await expect(page.locator('input[name="identifier"]')).toBeVisible();
  
  // 测试 Token 页面（公开部分）
  await page.goto('https://app.uspark.ai/settings/tokens');
  await expect(page.locator('h1:has-text("CLI Tokens")')).toBeVisible();
});
```

## 🏗️ 架构建议

### 理想的测试环境架构：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Local     │     │   Staging   │     │ Production  │
│   Dev       │────▶│   Testing   │────▶│   Live      │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
  sk_test_dev         sk_test_stg          sk_live_xxx
  (可以用)            (可以用)              (绝不能用！)
```

### Clerk 应用配置：

1. **开发应用** (Development)
   - URL: localhost:3000
   - Keys: `pk_test_dev_xxx`, `sk_test_dev_xxx`
   - 用途：本地开发和测试

2. **Staging 应用** (Staging)
   - URL: staging.uspark.ai
   - Keys: `pk_test_stg_xxx`, `sk_test_stg_xxx`
   - 用途：预发布测试

3. **生产应用** (Production)
   - URL: app.uspark.ai
   - Keys: `pk_live_xxx`, `sk_live_xxx`
   - 用途：真实用户，E2E 只用测试账户

## 📝 测试矩阵

| 环境 | URL | Secret Key | 测试方式 |
|-----|-----|------------|----------|
| Local | localhost:3000 | ✅ sk_test_dev | 全功能测试 |
| Staging | staging.uspark.ai | ✅ sk_test_stg | 全功能测试 |
| Production | app.uspark.ai | ❌ 禁止使用 | 测试账户/只读 |

## 🚀 实施步骤

### 1. 创建生产测试账户

在 Clerk Dashboard 的生产应用中：
1. 创建专用测试用户
2. 设置强密码
3. 可选：限制权限（只读/有限权限）

### 2. 配置 CI/CD

```yaml
# .github/workflows/e2e-production.yml
name: Production E2E Tests

on:
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨2点
  workflow_dispatch:     # 手动触发

jobs:
  e2e-production:
    runs-on: ubuntu-latest
    environment: production-e2e  # 独立的环境
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Production E2E Tests
        env:
          BASE_URL: https://app.uspark.ai
          E2E_TEST_EMAIL: ${{ secrets.E2E_PROD_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_PROD_PASSWORD }}
          # 注意：没有 CLERK_SECRET_KEY！
        run: |
          npm ci
          npm run test:production
```

### 3. 监控和报警

- 设置测试失败报警
- 监控测试账户的异常活动
- 定期轮换测试账户密码

## ⚠️ 安全检查清单

- [ ] 不使用生产 Secret Key
- [ ] 测试账户使用强密码
- [ ] 测试账户权限受限
- [ ] 密码存储在密钥管理系统
- [ ] 定期审计测试账户活动
- [ ] 测试不修改生产数据
- [ ] 测试在非高峰时段运行

## 🔴 绝对禁止

1. ❌ 使用生产 `sk_live_xxx` 密钥
2. ❌ 在代码中硬编码密码
3. ❌ 使用真实用户账户测试
4. ❌ 在生产环境创建/删除真实数据
5. ❌ 将生产密钥提交到代码库