# API generate-token/route.test.ts 详细分析

**文件路径**: `turbo/apps/web/app/api/cli/auth/generate-token/route.test.ts`

## 好的方面

✅ 测试真实的API handler
✅ 测试核心业务逻辑（token生成、限制）
✅ 使用真实数据库

---

## 测试列表

### Test 1: "should generate a new CLI token for authenticated user"
```typescript
it("should generate a new CLI token for authenticated user", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "user_123" });

  const request = new NextRequest(..., {
    body: JSON.stringify({ name: "GitHub Actions CI", expires_in_days: 30 })
  });

  const response = await POST(request);
  expect(response.status).toBe(201);

  const data = await response.json();
  expect(validationResult.success).toBe(true);
  expect(validData.token).toMatch(/^usp_live_[A-Za-z0-9_-]+$/);
  expect(validData.name).toBe("GitHub Actions CI");

  // Check expiration is approximately 30 days from now
  const diffInDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  expect(diffInDays).toBeGreaterThan(29);
  expect(diffInDays).toBeLessThanOrEqual(30);

  // Verify token was stored in database
  const storedTokens = await globalThis.services.db.select()...
  expect(storedToken).toBeDefined();
  expect(storedToken.name).toBe("GitHub Actions CI");
});
```
**状态**: ✅ 好的测试 - 测试核心token生成功能
**建议**: 保留

---

### Test 2: "should use default expiration of 90 days when not specified"
```typescript
it("should use default expiration of 90 days when not specified", async () => {
  const request = new NextRequest(..., {
    body: JSON.stringify({ name: "Default Token" })
  });

  const response = await POST(request);
  expect(response.status).toBe(201);

  const diffInDays = ...;
  expect(diffInDays).toBeGreaterThan(89);
  expect(diffInDays).toBeLessThanOrEqual(90);
});
```
**状态**: ✅ 好的测试 - 测试默认值行为
**建议**: 保留

---

### Test 3: "should return unauthorized error when user is not authenticated"
```typescript
it("should return unauthorized error when user is not authenticated", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: null });

  const response = await POST(request);
  expect(response.status).toBe(401);

  const validationResult = GenerateTokenErrorSchema.safeParse(data);
  expect(validationResult.success).toBe(true);
  expect(validationResult.data.error).toBe("unauthorized");
  expect(validationResult.data.error_description).toContain("Authentication required");
});
```
**状态**: ❌ 过度测试异常逻辑
**问题**:
- 测试401认证错误
- 认证应该由中间件处理
- 测试具体的error message
**建议**: 删除

---

### Test 4: "should enforce token limit per user"
```typescript
it("should enforce token limit per user", async () => {
  // Create 10 tokens (the max limit)
  for (let i = 0; i < 10; i++) {
    await createTestCLIToken("user_123", { ... });
  }

  // Try to create an 11th token
  const response = await POST(request);
  expect(response.status).toBe(403);

  expect(validationResult.data.error).toBe("token_limit_exceeded");
  expect(validationResult.data.max_tokens).toBe(10);
});
```
**状态**: ✅ 好的测试 - 测试重要的业务规则（token限制）
**问题**: 检查具体error message是实现细节
**建议**: 保留，但可简化error message检查

---

### Test 5: "should not count expired tokens towards the limit"
```typescript
it("should not count expired tokens towards the limit", async () => {
  // Create 5 expired tokens
  for (let i = 0; i < 5; i++) {
    await createTestCLIToken(testUserId, { expiresAt: pastDate });
  }

  // Create 9 active tokens
  for (let i = 0; i < 9; i++) {
    await createTestCLIToken(testUserId, { expiresAt: futureDate });
  }

  // Should be able to create one more token (total 10 active)
  const response = await POST(request);
  expect(response.status).toBe(201);

  // But not an 11th active token
  const response2 = await POST(request2);
  expect(response2.status).toBe(403);
});
```
**状态**: ✅ 好的测试 - 测试token过期逻辑
**建议**: 保留

---

### Test 6: "should return invalid request error for missing name"
```typescript
it("should return invalid request error for missing name", async () => {
  const request = new NextRequest(..., {
    body: JSON.stringify({ expires_in_days: 30 }) // Missing name
  });

  const response = await POST(request);
  expect(response.status).toBe(400);

  const validationResult = GenerateTokenErrorSchema.safeParse(data);
  expect(validationResult.data.error).toBe("invalid_request");
});
```
**状态**: ❌ 过度测试Schema Validation
**问题**:
- 测试missing field validation
- 应该由Zod schema保证
**建议**: 删除

---

### Test 7: "should return invalid request error for invalid expires_in_days"
```typescript
it("should return invalid request error for invalid expires_in_days", async () => {
  const request = new NextRequest(..., {
    body: JSON.stringify({ name: "Test Token", expires_in_days: 400 }) // > 365
  });

  const response = await POST(request);
  expect(response.status).toBe(400);

  expect(validationResult.data.error).toBe("invalid_request");
});
```
**状态**: ❌ 过度测试Schema Validation
**问题**: 同Test 6
**建议**: 删除

---

### Test 8: "should allow different users to have their own token limits"
```typescript
it("should allow different users to have their own token limits", async () => {
  // Create 10 tokens for user_123
  for (let i = 0; i < 10; i++) {
    await createTestCLIToken("user_123", { ... });
  }

  // User_456 should still be able to create tokens
  vi.mocked(auth).mockResolvedValue({ userId: "user_456" });

  const response = await POST(request);
  expect(response.status).toBe(201);
  expect(data.name).toBe("User 456 Token");
});
```
**状态**: ✅ 好的测试 - 测试用户隔离
**建议**: 保留

---

## 总结

- **总测试数**: 8
- **应该删除**: 3 (37.5%) - 异常测试和schema validation
- **应该保留**: 5 (62.5%) - 核心功能和业务逻辑

## 最终建议

**保留的测试** (5个):
1. "should generate a new CLI token for authenticated user"
2. "should use default expiration of 90 days when not specified"
3. "should enforce token limit per user"
4. "should not count expired tokens towards the limit"
5. "should allow different users to have their own token limits"

**删除的测试** (3个):
1. "should return unauthorized error when user is not authenticated"
2. "should return invalid request error for missing name"
3. "should return invalid request error for invalid expires_in_days"

**简化后**: 文件从336行减少到约210行。
