# CLI pull.test.ts 详细分析

**文件路径**: `turbo/apps/cli/src/__tests__/pull.test.ts`

## 好的方面

✅ 使用真实文件系统操作
✅ 使用mockServer而不是过度mock
✅ 导入并测试真实的pullCommand函数

---

## 测试列表

### describe: "pull command"

#### Test 1: "should pull a file from mock server to local filesystem"
```typescript
it("should pull a file from mock server to local filesystem", async () => {
  const projectId = "test-project";
  const filePath = "src/hello.ts";
  const fileContent = "export const greeting = 'Hello, World!';";

  mockServer.addFileToProject(projectId, filePath, fileContent);

  const outputPath = join(tempDir, "pulled-hello.ts");
  await pullCommand(filePath, { projectId, output: outputPath });

  const pulledContent = await readFile(outputPath, "utf8");
  expect(pulledContent).toBe(fileContent);
});
```
**状态**: ✅ 好的测试 - 测试核心功能
**建议**: 保留

---

#### Test 2: "should pull file to same path when no output specified"
**状态**: ✅ 好的测试 - 测试默认行为
**建议**: 保留

---

#### Test 3: "should throw error when file not found in project"
```typescript
it("should throw error when file not found in project", async () => {
  // Don't add any files to the project

  await expect(
    pullCommand(filePath, { projectId, output: outputPath })
  ).rejects.toThrow("File not found in project: nonexistent.txt");
});
```
**状态**: ❌ 过度测试异常逻辑
**问题**:
- 测试具体的error message
- 异常应该自然传播
**建议**: 删除

---

#### Test 4: "should throw error when not authenticated"
```typescript
it("should throw error when not authenticated", async () => {
  setOverrideConfig({ token: undefined, apiUrl: "http://localhost:3000" });

  await expect(
    pullCommand(filePath, { projectId, output: outputPath })
  ).rejects.toThrow("Not authenticated");
});
```
**状态**: ❌ 过度测试异常逻辑
**问题**:
- 认证应该在更高层处理
- 不需要在每个命令测试认证
**建议**: 删除

---

### describe: "pull --all command"

#### Test 5: "should pull all files from a project"
```typescript
it("should pull all files from a project", async () => {
  const files = {
    "src/index.ts": "export const main = () => console.log('main');",
    "src/utils.ts": "export const helper = (x: number) => x * 2;",
    "config/app.json": '{"name": "test-app", "version": "1.0.0"}',
    "README.md": "# Test Project\n\nThis is a test project.",
  };

  Object.entries(files).forEach(([path, content]) => {
    mockServer.addFileToProject(projectId, path, content);
  });

  await pullAllCommand({ projectId, output: tempDir });

  for (const [filePath, expectedContent] of Object.entries(files)) {
    const outputPath = join(tempDir, filePath);
    const pulledContent = await readFile(outputPath, "utf8");
    expect(pulledContent).toBe(expectedContent);
  }
});
```
**状态**: ✅ 好的测试 - 测试批量拉取功能
**建议**: 保留

---

#### Test 6: "should handle empty project gracefully"
```typescript
it("should handle empty project gracefully", async () => {
  // Don't add any files to the project

  await pullAllCommand({ projectId, output: tempDir });

  const files = readdirSync(tempDir);
  expect(files).toHaveLength(0);
});
```
**状态**: ❌ 过度测试边界情况
**问题**:
- 测试空项目是fallback逻辑
- 这种情况应该自然处理
**建议**: 删除

---

#### Test 7: "should throw error when file metadata not found" (skipped)
```typescript
it.skip("should throw error when file metadata not found", async () => {
  // This would need special setup to create a broken state
});
```
**状态**: ❌ 已跳过的测试，说明作者也知道这是过度测试
**建议**: 删除

---

#### Test 8: "should throw error when not authenticated"
**状态**: ❌ 重复的认证测试
**建议**: 删除

---

## 总结

- **总测试数**: 8 (其中1个已跳过)
- **应该删除**: 5 (63%) - 异常测试和边界情况
- **应该保留**: 3 (37%) - 核心功能测试

## 最终建议

**保留的测试** (3个):
1. "should pull a file from mock server to local filesystem"
2. "should pull file to same path when no output specified"
3. "should pull all files from a project"

**删除的测试** (5个):
1. "should throw error when file not found in project"
2. "should throw error when not authenticated" (第一个)
3. "should handle empty project gracefully"
4. "should throw error when file metadata not found" (已跳过)
5. "should throw error when not authenticated" (第二个)

**简化后**: 文件从207行减少到约100行，测试更专注于核心功能。
