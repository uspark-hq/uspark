# CLI push-multiple-blobs.test.ts 详细分析

**文件路径**: `turbo/apps/cli/src/__tests__/push-multiple-blobs.test.ts`

## 好的方面

✅ 测试真实的pushCommand函数
✅ 使用真实文件系统
✅ Mock @vercel/blob是合理的（外部依赖）

## 问题方面

❌ Mock console.log和console.error (line 47-48)
❌ 过多强调性注释（CRITICAL, MUST）
❌ 部分过度测试

---

## 测试列表

### Test 1: "should upload ALL unique blobs when pushing multiple files"
```typescript
it("should upload ALL unique blobs when pushing multiple files", async () => {
  await writeFile("file1.md", "content-one");
  await writeFile("file2.md", "content-two");
  await writeFile("file3.md", "content-three");

  await pushCommand(undefined, { projectId: testProjectId, all: true });

  // CRITICAL: Verify put was called 3 times
  expect(put).toHaveBeenCalledTimes(3);

  const calls = vi.mocked(put).mock.calls;
  const uploadedContents = calls.map((call) => call[1]);

  expect(uploadedContents).toContain("content-one");
  expect(uploadedContents).toContain("content-two");
  expect(uploadedContents).toContain("content-three");
});
```
**状态**: ✅ 好的测试 - 测试核心功能（确保所有blob都上传）
**问题**: 注释过度强调（"CRITICAL"）
**建议**: 保留，删除夸张注释

---

### Test 2: "should upload only unique blobs when files have duplicate content"
```typescript
it("should upload only unique blobs when files have duplicate content", async () => {
  await writeFile("file1.md", "duplicate-content");
  await writeFile("file2.md", "duplicate-content");
  await writeFile("file3.md", "unique-content");
  await writeFile("file4.md", "duplicate-content");

  await pushCommand(undefined, { projectId: testProjectId, all: true });

  // Should upload only 2 blobs (unique contents only)
  expect(put).toHaveBeenCalledTimes(2);

  const uploadedContents = calls.map((call) => call[1]);
  expect(uploadedContents).toContain("duplicate-content");
  expect(uploadedContents).toContain("unique-content");
});
```
**状态**: ✅ 好的测试 - 测试去重逻辑
**建议**: 保留

---

### Test 3: "should handle the hello/foo/bar scenario correctly"
```typescript
it("should handle the hello/foo/bar scenario correctly", async () => {
  // Reproduce the exact bug scenario
  await writeFile("foo.md", "foo");
  await writeFile("bar.md", "bar");
  await writeFile("hello.md", "hello");

  await pushCommand(undefined, { projectId: testProjectId, all: true });

  // MUST upload 3 blobs for 3 different contents
  expect(put).toHaveBeenCalledTimes(3);

  const uploadedContents = new Set(calls.map((call) => call[1]));
  expect(uploadedContents.has("foo")).toBe(true);
  expect(uploadedContents.has("bar")).toBe(true);
  expect(uploadedContents.has("hello")).toBe(true);
});
```
**状态**: ⚠️ 重复测试 - 和Test 1基本相同
**问题**:
- 这是针对特定bug的回归测试
- 功能和Test 1重复
**建议**: 删除或合并到Test 1

---

### Test 4: "should not re-upload blobs on second push of same content"
```typescript
it("should not re-upload blobs on second push of same content", async () => {
  await writeFile("test.md", "test-content");
  await pushCommand("test.md", { projectId: testProjectId });

  expect(put).toHaveBeenCalledTimes(1);
  vi.clearAllMocks();

  // Second push of same file (no changes)
  await pushCommand("test.md", { projectId: testProjectId });

  // Should NOT upload blob again
  expect(put).toHaveBeenCalledTimes(0);
});
```
**状态**: ❌ 过度测试实现细节
**问题**:
- 测试了缓存/优化逻辑
- 这应该由实现自然保证
- 如果实现改为"总是上传"也可以接受
**建议**: 删除

---

### Test 5: "should upload the correct number of blobs without duplicate uploads"
```typescript
it("should upload the correct number of blobs without duplicate uploads", async () => {
  await writeFile("a.txt", "alpha");
  await writeFile("b.txt", "beta");
  await writeFile("c.txt", "gamma");

  await pushCommand(undefined, { projectId: testProjectId, all: true });

  expect(put).toHaveBeenCalledTimes(3);

  const uploadedContents = new Set(calls.map((call) => call[1]));
  expect(uploadedContents.has("alpha")).toBe(true);
  expect(uploadedContents.has("beta")).toBe(true);
  expect(uploadedContents.has("gamma")).toBe(true);
});
```
**状态**: ⚠️ 重复测试 - 和Test 1、Test 3完全相同的逻辑
**建议**: 删除

---

## beforeEach问题分析

```typescript
beforeEach(async () => {
  // ...

  // Mock console
  console.log = vi.fn();      // ❌ 不应该mock console
  console.error = vi.fn();    // ❌ 不应该mock console
});
```
**问题**: Mock console是防御性编程，应该删除

---

## 总结

- **总测试数**: 5
- **应该删除**: 3 (60%) - 重复测试和过度测试
- **应该保留**: 2 (40%) - 核心功能测试

## 最终建议

**保留的测试** (2个):
1. "should upload ALL unique blobs when pushing multiple files"
2. "should upload only unique blobs when files have duplicate content"

**删除的测试** (3个):
1. "should handle the hello/foo/bar scenario correctly" - 重复
2. "should not re-upload blobs on second push of same content" - 过度测试
3. "should upload the correct number of blobs without duplicate uploads" - 重复

**额外修改**:
- 删除 console.log/console.error 的mock (line 47-48)
- 删除所有"CRITICAL"、"MUST"等强调性注释

**简化后**: 文件从174行减少到约80行。
