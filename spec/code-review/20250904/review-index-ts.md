# Code Review: turbo/apps/cli/src/index.ts

## 文件路径
`turbo/apps/cli/src/index.ts`

## 主要变更范围

### 1. 导入语句变更 (Line 4)
**变更:**
```typescript
// 变更前
import { authenticate, logout } from "./auth";
// 变更后
import { authenticate, logout, checkAuthStatus } from "./auth";
```
- **原因:** 新增`checkAuthStatus`函数用于查看认证状态

### 2. 认证命令重构 (Lines 33-57)
**变更前:** 单一的`auth`命令
```typescript
program
  .command("auth")
  .description("Authenticate with uSpark")
  .action(async (options) => {
    try {
      await authenticate(options.apiUrl);
    } catch {
      process.exit(1);
    }
  });
```

**变更后:** 父子命令结构
```typescript
const authCommand = program
  .command("auth")
  .description("Authentication commands");

authCommand
  .command("login")
  .description("Log in to uSpark")
  .action(async (options) => {
    await authenticate(options.apiUrl);
  });

authCommand
  .command("logout")
  .description("Log out of uSpark")
  //...

authCommand
  .command("status")
  .description("Show current authentication status")
  //...
```
- **原因:** 更好的命令组织结构，符合CLI工具的最佳实践

### 3. 移除try-catch块 (Lines 40-42)
**变更前:**
```typescript
try {
  await authenticate(options.apiUrl);
} catch {
  process.exit(1);
}
```
**变更后:**
```typescript
await authenticate(options.apiUrl);
```
- **原因:** 遵循项目"避免防御性编程"原则

### 4. 默认API URL变更 (Line 40)
**变更:**
- 从`http://localhost:3000`改为`https://app.uspark.com`
- **原因:** 切换到生产环境URL

### 5. 新增状态命令 (Lines 52-57)
**新增:**
```typescript
authCommand
  .command("status")
  .description("Show current authentication status")
  .action(async () => {
    await checkAuthStatus();
  });
```
- **原因:** 提供快速查看认证状态的功能

### 6. 错误提示信息更新 (Lines 112, 141)
**变更:**
- 从`"Please run 'uspark auth' first"`
- 改为`"Please run 'uspark auth login' first"`
- **原因:** 反映新的命令结构

### 7. 模块检测方式变更 (Lines 164-166)
**变更前:**
```typescript
if (require.main === module) {
  program.parse();
}
```
**变更后:**
```typescript
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
```
- **原因:** 适配ES模块系统，替代CommonJS的检测方式

## 命令结构变化

### 旧命令:
- `uspark auth` - 登录
- `uspark logout` - 登出

### 新命令:
- `uspark auth login` - 登录
- `uspark auth logout` - 登出
- `uspark auth status` - 查看状态

## 影响分析

1. **破坏性变更:** 用户需要更新命令从`uspark auth`到`uspark auth login`
2. **用户体验提升:** 更清晰的命令组织结构
3. **功能增强:** 新增状态查看功能

## 建议

1. 在README或文档中更新新的命令格式
2. 考虑添加命令别名以保持向后兼容性
3. 为`auth`命令添加默认行为（如显示帮助信息）