# 如何获取 Clerk Session Token

## 步骤 1: 手动登录
1. 打开浏览器访问 https://app.uspark.ai
2. 正常登录你的账户

## 步骤 2: 获取 Token
1. 打开浏览器开发者工具 (F12)
2. 进入 Application/Storage 标签
3. 找到 Local Storage
4. 查找 `__clerk_db_jwt` 键
5. 复制对应的值

## 步骤 3: 使用 Token
在 `.env.local` 文件中设置：
```env
CLERK_TEST_SESSION_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 步骤 4: 运行测试
```bash
npm run test:prod
```