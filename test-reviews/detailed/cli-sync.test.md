# CLI sync.test.ts 详细分析

**文件路径**: `turbo/apps/cli/src/commands/__tests__/sync.test.ts`

## 好的方面

✅ 使用真实文件系统
✅ 测试YDoc更新（核心逻辑）
✅ 使用MSW mock网络请求

## 问题方面

❌ Mock console.log/error/warn (line 49-51)
❌ 大量异常逻辑测试
❌ 测试实现细节（console输出）

---

## 测试列表

### describe: "pushCommand"

#### Test 1: "should push a single file successfully"
```typescript
it("should push a single file successfully", async () => {
  await fs.writeFile("test.txt", "test content");

  await pushCommand("test.txt", { projectId: "proj-123" });

  expect(console.log).toHaveBeenCalledWith(
    chalk.green("✓ Successfully pushed test.txt")
  );
});
```
**状态**: ⚠️ 部分好 - 测试核心功能，但检查console输出是实现细节
**问题**:
- `expect(console.log).toHaveBeenCalledWith(...)` 是测试实现细节
**建议**: 保留功能测试，删除console输出检查

---

#### Test 2: "should actually update the YDoc with pushed files"
```typescript
it("should actually update the YDoc with pushed files", async () => {
  await fs.writeFile("file1.txt", "content1");
  await fs.mkdir("dir", { recursive: true });
  await fs.writeFile("dir/file2.txt", "content2");

  await pushCommand("file1.txt", { projectId: "proj-123" });

  // Verify the file is in the YDoc
  expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
  expect(mockServer.hasFile("proj-123", "dir/file2.txt")).toBe(false);

  await pushCommand("dir/file2.txt", { projectId: "proj-123" });

  expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
  expect(mockServer.hasFile("proj-123", "dir/file2.txt")).toBe(true);

  // Verify the YDoc structure
  const projectDoc = mockServer.getProjectDoc("proj-123");
  expect(projectDoc).toBeDefined();

  const files = projectDoc?.getMap("files");
  expect(files?.size).toBe(2);

  const file1Node = files?.get("file1.txt") as { hash: string };
  expect(file1Node).toBeDefined();
  expect(file1Node.hash).toBeDefined();
});
```
**状态**: ✅ 好的测试 - 测试核心YDoc更新逻辑
**建议**: 保留

---

#### Test 3: "should push all files with --all flag"
```typescript
it("should push all files with --all flag", async () => {
  await fs.writeFile("file1.txt", "content1");
  await fs.mkdir("subdir");
  await fs.writeFile("subdir/file2.txt", "content2");

  // Create some files to ignore
  await fs.mkdir("node_modules");
  await fs.writeFile("node_modules/test.js", "should be ignored");
  await fs.mkdir(".git");
  await fs.writeFile(".git/config", "should be ignored");

  await pushCommand(undefined, { projectId: "proj-123", all: true });

  expect(console.log).toHaveBeenCalledWith(chalk.blue("Found 2 files to push"));
  expect(console.log).toHaveBeenCalledWith(chalk.green("✓ Successfully pushed 2 files"));

  expect(mockServer.hasFile("proj-123", "file1.txt")).toBe(true);
  expect(mockServer.hasFile("proj-123", "subdir/file2.txt")).toBe(true);
  expect(mockServer.hasFile("proj-123", "node_modules/test.js")).toBe(false);
  expect(mockServer.hasFile("proj-123", ".git/config")).toBe(false);

  const allFiles = mockServer.getAllFiles("proj-123");
  expect(allFiles).toHaveLength(2);
  expect(allFiles).toContain("file1.txt");
  expect(allFiles).toContain("subdir/file2.txt");
});
```
**状态**: ✅ 好的测试 - 测试批量push和过滤逻辑
**问题**: console.log检查是实现细节
**建议**: 保留，删除console输出检查

---

#### Test 4: "should fail fast on network errors"
```typescript
it("should fail fast on network errors", async () => {
  await fs.writeFile("file1.txt", "content1");

  server.use(
    http.patch("http://localhost:3000/api/projects/proj-123", () => {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    })
  );

  await expect(
    pushCommand("file1.txt", { projectId: "proj-123" })
  ).rejects.toThrow("Failed to sync to remote");
});
```
**状态**: ❌ 过度测试异常逻辑
**问题**:
- 测试网络错误处理
- 错误应该自然传播
**建议**: 删除

---

#### Test 5: "should fail fast on batch push with network error"
**状态**: ❌ 和Test 4重复的异常测试
**建议**: 删除

---

#### Test 6: "should throw error when no file path"
```typescript
it("should throw error when no file path", async () => {
  await expect(
    pushCommand(undefined, { projectId: "proj-123" })
  ).rejects.toThrow("File path is required");
});
```
**状态**: ❌ 过度测试参数验证
**问题**:
- 测试输入验证
- 应该由schema或类型系统保证
**建议**: 删除

---

#### Test 7: "should handle missing file error"
```typescript
it("should handle missing file error", async () => {
  await expect(
    pushCommand("nonexistent.txt", { projectId: "proj-123" })
  ).rejects.toThrow();
});
```
**状态**: ❌ 过度测试异常
**建议**: 删除

---

### describe: "pullCommand"

#### Test 8: "should pull a file successfully"
```typescript
it("should pull a file successfully", async () => {
  mockServer.addFileToProject("proj-123", "test.txt", "test file content");

  await pullCommand("test.txt", { projectId: "proj-123" });

  const fileExists = await fs.access("test.txt").then(() => true).catch(() => false);
  expect(fileExists).toBe(true);

  const content = await fs.readFile("test.txt", "utf8");
  expect(content).toBe("test file content");

  expect(console.log).toHaveBeenCalledWith(
    chalk.green("✓ Successfully pulled to test.txt")
  );
});
```
**状态**: ✅ 好的测试 - 测试核心pull功能
**问题**: console.log检查是实现细节
**建议**: 保留，删除console输出检查

---

#### Test 9: "should pull a file to custom output path"
**状态**: ✅ 好的测试 - 测试自定义路径
**问题**: console.log检查是实现细节
**建议**: 保留，删除console输出检查

---

#### Test 10: "should handle project not found error"
```typescript
it("should handle project not found error", async () => {
  server.use(
    http.get("http://localhost:3000/api/projects/:projectId", ({ params }) => {
      if (params.projectId === "nonexistent") {
        return HttpResponse.json(
          { error: "project_not_found", error_description: "Project not found" },
          { status: 404 }
        );
      }
      return HttpResponse.json(
        { error: "project_not_found", error_description: "Project not found" },
        { status: 404 }
      );
    })
  );

  await expect(
    pullCommand("test.txt", { projectId: "nonexistent" })
  ).rejects.toThrow();
});
```
**状态**: ❌ 过度测试异常逻辑
**建议**: 删除

---

## beforeEach问题分析

```typescript
beforeEach(async () => {
  // ...

  // Mock console methods
  console.log = vi.fn();    // ❌ 不应该mock
  console.error = vi.fn();  // ❌ 不应该mock
  console.warn = vi.fn();   // ❌ 不应该mock
});
```

---

## 总结

- **总测试数**: 10
- **应该删除**: 5 (50%) - 异常测试和参数验证
- **应该保留**: 5 (50%) - 核心功能测试
- **需要修改**: 删除所有console输出检查

## 最终建议

**保留的测试** (5个):
1. "should push a single file successfully" (删除console检查)
2. "should actually update the YDoc with pushed files"
3. "should push all files with --all flag" (删除console检查)
4. "should pull a file successfully" (删除console检查)
5. "should pull a file to custom output path" (删除console检查)

**删除的测试** (5个):
1. "should fail fast on network errors"
2. "should fail fast on batch push with network error"
3. "should throw error when no file path"
4. "should handle missing file error"
5. "should handle project not found error"

**额外修改**:
- 删除 console.log/error/warn 的mock (line 49-51)
- 删除所有 `expect(console.log).toHaveBeenCalledWith(...)` 检查

**简化后**: 文件从290行减少到约150行。
