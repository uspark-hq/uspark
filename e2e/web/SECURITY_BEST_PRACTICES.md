# E2E 测试安全最佳实践

## 🔐 关于 Secret Key 的使用

### 何时可以使用 Secret Key（谨慎）

✅ **开发环境**
- 本地开发测试
- 使用专门的测试环境 Secret Key（不是生产密钥）
- 密钥存储在 `.env.local` 中（已加入 .gitignore）

✅ **安全的 CI/CD**
- 使用 GitHub Secrets 或类似的密钥管理服务
- CI 环境自动遮蔽日志中的密钥
- 仅限内部/私有仓库

### 何时不应使用 Secret Key

❌ **公开代码**
- 开源项目
- 公开的示例代码
- 代码分享平台

❌ **不安全的环境**
- 第三方 CI 服务（未配置密钥管理）
- 共享的测试环境
- 日志未遮蔽的系统

## 🛡️ 推荐的安全方案

### 方案 1：分离测试环境（最佳）

```env
# 使用独立的测试应用（与生产隔离）
CLERK_TEST_PUBLISHABLE_KEY=pk_test_xxx  # 测试环境密钥
CLERK_TEST_SECRET_KEY=sk_test_xxx       # 仅在必要时使用

# 测试用户（专门创建的测试账户）
E2E_CLERK_USER_USERNAME=e2e-test@example.com
E2E_CLERK_USER_PASSWORD=TestOnly123!
```

### 方案 2：仅使用 UI 登录（最安全）

```javascript
// 不需要 Secret Key
test('safe login', async ({ page }) => {
  await page.goto('/sign-in');
  await page.fill('input[name="identifier"]', process.env.E2E_USER);
  await page.fill('input[type="password"]', process.env.E2E_PASS);
  // ...
});
```

### 方案 3：使用 Testing Token（折中方案）

```bash
# 从 Clerk Dashboard 手动获取 Testing Token
# 定期更新，不提交到代码库
CLERK_TESTING_TOKEN=test_token_xxx
```

## 📊 决策矩阵

| 场景 | Secret Key | UI 登录 | Testing Token |
|-----|------------|---------|---------------|
| 本地开发 | ✅ 可以 | ✅ 推荐 | ✅ 可以 |
| 私有 CI/CD | ⚠️ 谨慎 | ✅ 推荐 | ✅ 可以 |
| 公开仓库 | ❌ 禁止 | ✅ 推荐 | ⚠️ 谨慎 |
| 生产测试 | ❌ 禁止 | ✅ 推荐 | ❌ 避免 |

## 🔑 密钥管理清单

- [ ] 使用环境变量，不硬编码
- [ ] `.env` 文件加入 `.gitignore`
- [ ] CI/CD 使用密钥管理服务
- [ ] 定期轮换密钥
- [ ] 监控异常使用
- [ ] 使用测试环境，不用生产密钥
- [ ] 最小权限原则

## 💡 实用建议

1. **开发阶段**：可以使用 `@clerk/testing` + Secret Key 快速迭代
2. **CI/CD 阶段**：使用 GitHub Secrets 安全存储
3. **生产阶段**：仅使用 UI 登录或只读测试
4. **开源项目**：提供文档让用户配置自己的密钥

## 示例：GitHub Actions 安全配置

```yaml
name: E2E Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run E2E Tests
        env:
          # 使用 GitHub Secrets（不会显示在日志中）
          CLERK_SECRET_KEY: ${{ secrets.CLERK_TEST_SECRET_KEY }}
          E2E_USER: ${{ secrets.E2E_TEST_USERNAME }}
          E2E_PASS: ${{ secrets.E2E_TEST_PASSWORD }}
        run: npm test
```

## 结论

- **Clerk 官方方案**（使用 Secret Key）是为了**便利性**
- **实际使用**时需要根据环境选择合适的方案
- **优先考虑安全性**，特别是在生产和公开环境
- **UI 登录**是最安全但速度较慢的方案
- **合理使用**密钥管理工具和环境隔离