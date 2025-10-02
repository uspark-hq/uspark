# Web API Tests Review

## Summary
总计35个测试文件（包括1个非API测试），发现严重的过度测试问题。

## 共同问题模式

### ❌ 1. 过度测试异常逻辑
**几乎所有测试都包含大量异常场景测试**

#### 示例
```typescript
// ❌ 这些异常测试是不必要的
it("should return 401 when not authenticated", async () => {
  mockAuth.mockResolvedValueOnce({ userId: null });
  const response = await apiCall(GET, "GET", { projectId });
  expect(response.status).toBe(401);
  expect(response.data).toHaveProperty("error", "unauthorized");
});

it("should return 404 for non-existent project", async () => {
  const response = await apiCall(GET, "GET", { projectId: "non-existent" });
  expect(response.status).toBe(404);
  expect(response.data).toHaveProperty("error", "project_not_found");
});
```

#### 为什么这是过度测试
- 异常逻辑应该由实现自然处理，不需要专门测试
- 这些测试只是重复验证框架和中间件的功能
- 增加维护负担，没有提供实际价值

### ❌ 2. 过度测试Schema Validation
**大量测试验证了schema的基本功能**

#### 示例（from projects/route.test.ts）
```typescript
// ❌ 这些validation测试是不必要的
it("should reject empty name", async () => {
  const response = await apiCall(POST, "POST", {}, { name: "" });
  expect(response.status).toBe(400);
  expect(response.data.error_description).toContain("Project name is required");
});

it("should reject name that is too long", async () => {
  const longName = "a".repeat(101);
  const response = await apiCall(POST, "POST", {}, { name: longName });
  expect(response.status).toBe(400);
});

it("should reject non-string name", async () => {
  const response = await apiCall(POST, "POST", {}, { name: 123 });
  expect(response.status).toBe(400);
});
```

#### 为什么这是过度测试
- Schema库（Zod）已经保证了这些验证
- 测试应该信任schema库，不需要重复测试
- 如果schema改变，这些测试会成为维护负担

### ❌ 3. 过度测试Fallback逻辑

#### 示例（from github/setup/route.test.ts）
```typescript
// ❌ 测试fallback是bad smell
it("should use fallback account name when GitHub API fails", async () => {
  mockGetInstallationDetails.mockRejectedValueOnce(new Error("API Error"));
  const response = await GET(mockRequest);
  expect(response.status).toBe(307);
  expect(storedInstallations[0].accountName).toBe(`installation-${installationId}`);
});
```

#### 为什么这是bad smell
- Fallback本身就是一个坏味道
- 应该让API调用失败，而不是使用fallback
- 测试fallback等于鼓励bad practice

### ❌ 4. 过度测试错误message内容

#### 示例（from share/[token]/route.test.ts）
```typescript
// ❌ 测试具体error message是实现细节
it("should return 400 for missing token", async () => {
  const response = await apiCall(GET, "GET", { token: "" });
  expect(response.status).toBe(400);
  expect(response.data).toMatchObject({
    error: "share_not_found",
    error_description: "Invalid or missing token",  // 测试了具体文案
  });
});
```

### ❌ 5. 过度测试边界情况

#### 示例（from share/[token]/route.test.ts）
```typescript
// ❌ 这些边界情况测试过度
it("should handle YDoc with invalid file node structure", async () => {
  files.set(testFilePath, "invalid-file-node");
  // ...
});

it("should handle file node without hash", async () => {
  files.set(testFilePath, { mtime: Date.now() });
  // ...
});
```

## ✅ 好的方面

### 1. 使用真实数据库
```typescript
// ✅ 好的：使用真实数据库操作
initServices();
await globalThis.services.db.insert(SHARE_LINKS_TBL).values({...});
```

### 2. 测试核心功能
```typescript
// ✅ 好的：测试实际业务逻辑
it("should create a new session", async () => {
  const response = await apiCall(POST, "POST", { projectId }, { title: "Test Session" });
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty("id");
});
```

### 3. 测试权限和用户隔离
```typescript
// ✅ 好的：测试权限逻辑
it("should return 404 when trying to delete another user's share", async () => {
  // 创建另一个用户的share
  // 尝试删除
  // 验证失败
});
```

## 具体文件分析

### settings/tokens/actions.test.ts
**特殊情况：不是API测试，而是纯逻辑测试**

问题：
- 复制了token生成逻辑（line 64-68）而不是导入真实函数
- 过度测试schema validation
- 测试了Date.toISOString()格式（line 84-89），这是测试JavaScript内置功能

### installation-status/route.test.ts
- ✅ 测试用户隔离（合理）
- ❌ 测试401 unauthorized（过度）
- ❌ 测试null when no installation（过度）

### cli/auth/device/route.test.ts
相对合理的测试：
- ✅ 测试device code格式
- ✅ 测试TTL
- ✅ 测试唯一性
- ⚠️ 可能有轻微过度测试TTL的精确值

### projects/[projectId]/sessions/route.api.test.ts
- ✅ 测试CRUD功能
- ✅ 测试pagination
- ❌ 过度测试401, 404
- ❌ 过度测试invalid pagination parameters

### share/[token]/route.test.ts
- ✅ 测试正常的share功能
- ❌ 大量过度测试错误情况（5个错误测试）
- ❌ 过度测试边界情况

### shares/[id]/route.test.ts
- ✅ 测试delete功能
- ✅ 测试权限检查
- ❌ 测试401, 404（过度）
- ⚠️ 测试"只删除指定share"可能是过度测试

### projects/route.test.ts
- ✅ 测试CRUD功能
- ✅ 测试用户隔离
- ❌ 大量schema validation测试（5个测试）
- ❌ 测试invalid JSON（line 218-231）

### github/setup/route.test.ts
- ✅ 测试setup flow
- ❌ 大量错误场景测试（8+个）
- ❌ 测试fallback逻辑

## 整体建议

### 立即删除的测试类型
1. 所有401 unauthorized测试
2. 所有404 not found测试（除非涉及权限）
3. 所有schema validation测试（empty, too long, invalid type等）
4. 所有fallback逻辑测试
5. 所有具体error message测试

### 保留的测试类型
1. 核心CRUD功能测试
2. 权限和用户隔离测试
3. 业务逻辑测试（如pagination, 唯一性等）

### 预估影响
- **可以删除的测试：~60-70%**
- **应该保留的测试：~30-40%**

### 重写建议
对于settings/tokens/actions.test.ts：
- 导入真实的token生成函数而不是复制代码
- 删除所有schema validation测试
- 删除Date format测试
