# Clerk E2E Testing Setup Guide

## 📋 你需要从 Clerk Dashboard 获取的内容

### 1. API Keys（在 Clerk Dashboard）
1. 登录 [Clerk Dashboard](https://dashboard.clerk.com)
2. 选择你的应用
3. 进入 **"API Keys"** 页面
4. 获取以下内容：
   - **Publishable Key**: `pk_test_...`（用于客户端）
   - **Secret Key**: `sk_test_...`（用于服务端，保密）

### 2. 创建测试用户
1. 在 Dashboard 进入 **"Users"** 页面
2. 点击 **"Create user"**
3. 创建一个测试用户，记录：
   - 用户名/邮箱
   - 密码

### 3. 启用用户名/密码认证
1. 进入 **"User & Authentication"** → **"Email, Phone, Username"**
2. 确保启用了以下选项之一：
   - Email address + Password
   - Username + Password

## 🛠 本地设置步骤

### 步骤 1: 安装依赖
```bash
cd /workspaces/uspark1/e2e/web
npm install @clerk/testing
```

### 步骤 2: 配置环境变量
创建 `.env.local` 文件：
```env
# Clerk API Keys（从 Dashboard 获取）
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
# 注意：如果使用 clerkSetup()，需要 Secret Key
# 但更安全的方式是使用 Testing Token 或真实账户登录
# CLERK_SECRET_KEY=sk_test_your_secret_key_here（仅在必要时使用）

# 测试用户凭据
E2E_CLERK_USER_USERNAME=test@example.com
E2E_CLERK_USER_PASSWORD=YourTestPassword123

# 或者使用用户名登录
# E2E_CLERK_USER_USERNAME=testuser
# E2E_CLERK_USER_PASSWORD=YourTestPassword123
```

### 步骤 3: 配置 Playwright Global Setup
创建 `playwright/global-setup.ts`：
```typescript
import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

setup('global setup', async ({}) => {
  await clerkSetup()
})
```

### 步骤 4: 更新 Playwright 配置
更新 `playwright.config.ts`：
```typescript
export default defineConfig({
  // ... 其他配置
  globalSetup: './playwright/global-setup.ts',
  use: {
    storageState: 'playwright/.clerk/auth.json',
  },
})
```

### 步骤 5: 更新 .gitignore
```gitignore
playwright/.clerk/
.env.local
```

## ✅ 测试方式

### 方式 1: 使用 @clerk/testing（推荐）
```typescript
import { test } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'

test('authenticated test', async ({ page }) => {
  // 自动使用保存的认证状态
  await page.goto('/settings/tokens')
  // 已经登录，可以直接测试
})

test('sign in during test', async ({ page }) => {
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_USER_USERNAME!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    }
  })
})
```

### 方式 2: 手动使用 Testing Token
```typescript
test('manual testing token', async ({ page }) => {
  const testingToken = process.env.CLERK_TESTING_TOKEN
  await page.goto(`/sign-in?__clerk_testing_token=${testingToken}`)
  // 应该自动完成认证
})
```

## 🚀 运行测试

```bash
# 确保环境变量已设置
source .env.local

# 运行认证测试
npx playwright test --project=authenticated

# 或运行所有测试
npm test
```

## ⚠️ 注意事项

1. **Testing Token 是短期的** - 由 `clerkSetup()` 自动管理
2. **不要提交密钥** - 确保 `.env.local` 在 `.gitignore` 中
3. **CI/CD 环境** - 需要在 CI 中设置相同的环境变量
4. **多因素认证** - Testing helpers 目前不支持 MFA

## 🔗 参考资源

- [Clerk Playwright 文档](https://clerk.com/docs/testing/playwright/overview)
- [Clerk 测试示例仓库](https://github.com/clerk/clerk-playwright-nextjs)
- [@clerk/testing NPM 包](https://www.npmjs.com/package/@clerk/testing)