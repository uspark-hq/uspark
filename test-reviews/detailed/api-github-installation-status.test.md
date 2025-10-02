# API github/installation-status/route.test.ts 详细分析

**文件路径**: `turbo/apps/web/app/api/github/installation-status/route.test.ts`

## 测试列表

### Test 1: "returns 401 when user is not authenticated"
```typescript
it("returns 401 when user is not authenticated", async () => {
  mockAuth.mockResolvedValue({ userId: null });

  const response = await GET();
  expect(response.status).toBe(401);
  expect(data).toEqual({ error: "Unauthorized" });
});
```
**状态**: ❌ 过度测试异常逻辑
**问题**: 认证应该由中间件处理
**建议**: 删除

---

### Test 2: "returns null when no installation found"
```typescript
it("returns null when no installation found", async () => {
  const response = await GET();

  expect(response.status).toBe(200);
  expect(data).toEqual({ installation: null });
});
```
**状态**: ❌ 过度测试empty state
**问题**:
- 测试没有数据时返回null
- 这是fallback/empty state逻辑
**建议**: 删除

---

### Test 3: "returns installation details when installation exists"
```typescript
it("returns installation details when installation exists", async () => {
  await globalThis.services.db.insert(githubInstallations).values({
    id: `install-${testUserId}-1`,
    userId: testUserId,
    installationId: ghInstallationId,
    accountName: "test-org",
  });

  const response = await GET();

  expect(response.status).toBe(200);
  expect(data.installation).toMatchObject({
    installationId: ghInstallationId,
    accountName: "test-org",
    accountType: "user",
    repositorySelection: "selected",
  });
});
```
**状态**: ✅ 好的测试 - 测试核心查询功能
**建议**: 保留

---

### Test 4: "returns only the current user's installation"
```typescript
it("returns only the current user's installation", async () => {
  // Insert installation for another user
  await globalThis.services.db.insert(githubInstallations).values({
    userId: otherUserId,
    installationId: otherGhInstallationId,
    accountName: "other-org",
  });

  // Insert installation for test user
  await globalThis.services.db.insert(githubInstallations).values({
    userId: testUserId,
    installationId: testGhInstallationId,
    accountName: "test-org",
  });

  const response = await GET();

  expect(data.installation.installationId).toBe(testGhInstallationId);
  expect(data.installation.accountName).toBe("test-org");
});
```
**状态**: ✅ 好的测试 - 测试用户隔离（重要安全功能）
**建议**: 保留

---

## 总结

- **总测试数**: 4
- **应该删除**: 2 (50%) - 异常和empty state
- **应该保留**: 2 (50%) - 核心功能和用户隔离

## 最终建议

**保留的测试** (2个):
1. "returns installation details when installation exists"
2. "returns only the current user's installation"

**删除的测试** (2个):
1. "returns 401 when user is not authenticated"
2. "returns null when no installation found"

**简化后**: 文件从111行减少到约70行。
