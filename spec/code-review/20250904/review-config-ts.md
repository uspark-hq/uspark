# Code Review: turbo/apps/cli/src/config.ts

## 文件路径
`turbo/apps/cli/src/config.ts`

## 主要变更范围

### 1. 导入语句变更 (Line 3)
**变更:**
```typescript
// 变更前
import { readFile, writeFile, mkdir } from "fs/promises";
// 变更后
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
```
- **原因:** 添加`unlink`用于真正删除文件，而不是清空内容

### 2. 配置接口扩展 (Lines 6-13)
**新增字段:**
```typescript
user?: {
  id: string;
  email: string;
}
```
- **原因:** 支持存储用户信息，为未来功能扩展做准备

### 3. 移除防御性编程 (Lines 18-24, 27-36, 55-58)
**变更前:**
```typescript
export async function loadConfig(): Promise<CliConfig> {
  try {
    // ... logic
  } catch (error) {
    console.error("Failed to load config:", error);
    return {};
  }
}
```
**变更后:**
```typescript
export async function loadConfig(): Promise<CliConfig> {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  const content = await readFile(CONFIG_FILE, "utf8");
  return JSON.parse(content);
}
```
- **原因:** 遵循项目"避免防御性编程"原则，让异常自然传播

### 4. 环境变量优先级调整 (Lines 38-45)
**变更内容:**
```typescript
export async function getToken(): Promise<string | undefined> {
  // 环境变量优先
  if (process.env.USPARK_TOKEN) {
    return process.env.USPARK_TOKEN;
  }
  const config = await loadConfig();
  return config.token;
}
```
- **原因:** 环境变量优先于配置文件，便于CI/CD环境和临时覆盖

### 5. 默认API URL变更 (Line 51)
**变更:**
- 从`http://localhost:3000`改为`https://app.uspark.com`
- **原因:** 切换到生产环境URL作为默认值

### 6. 清理配置策略变更 (Lines 55-58)
**变更前:**
```typescript
await writeFile(CONFIG_FILE, "{}", "utf8");  // 写入空JSON
```
**变更后:**
```typescript
await unlink(CONFIG_FILE);  // 完全删除文件
```
- **原因:** 彻底清理配置，不留痕迹

## 移除的错误处理

所有函数都移除了try-catch块：
- `loadConfig()` - 移除JSON解析错误处理
- `saveConfig()` - 移除文件写入错误处理
- `clearConfig()` - 移除文件删除错误处理

## 潜在问题

1. **JSON解析错误:** 如果配置文件包含无效JSON，`JSON.parse()`会抛出异常导致程序崩溃
2. **文件权限问题:** 文件系统操作失败会直接传播，可能导致不友好的错误信息
3. **竞态条件:** 多个进程同时操作配置文件可能导致数据丢失

## 建议改进

1. 考虑为`JSON.parse()`添加基础错误处理，返回默认配置而不是崩溃
2. 文档化环境变量优先级行为
3. 考虑添加文件锁机制防止并发写入问题

## 符合项目原则

✅ **YAGNI原则:** 移除了不必要的错误处理
✅ **避免防御性编程:** 让异常自然传播
✅ **代码简洁性:** 减少了不必要的嵌套和复杂度