# CLI watch-claude.test.ts 详细分析

**文件路径**: `turbo/apps/cli/src/__tests__/watch-claude.test.ts`

## 核心问题

**致命问题**: 测试代码复制粘贴了实现代码（line 5-64），而不是导入真实函数

```typescript
// ❌ 在测试文件中复制实现
function isFileModificationTool(toolName: string, toolInput: Record<string, unknown>): boolean {
  // ... 完整实现代码
}

function extractFilePath(toolName: string, toolInput: Record<string, unknown>): string | null {
  // ... 完整实现代码
}

function shouldSyncFile(jsonLine: string): string | null {
  // ... 完整实现代码
}
```

**影响**: 如果真实实现改变，测试不会失败！测试完全失效！

---

## 测试列表

### describe: "isFileModificationTool"

#### Test 1: "should return true for Edit tool with file_path"
```typescript
it("should return true for Edit tool with file_path", () => {
  const result = isFileModificationTool("Edit", { file_path: "test.js" });
  expect(result).toBe(true);
});
```
**状态**: ❌ 测试复制的代码
**建议**: 重写 - 导入真实函数

---

#### Test 2: "should return true for Write tool with file_path"
**状态**: ❌ 同上
**建议**: 重写

---

#### Test 3: "should return true for MultiEdit tool with file_path"
**状态**: ❌ 同上
**建议**: 重写

---

#### Test 4: "should return true for NotebookEdit tool with file_path"
**状态**: ❌ 同上
**建议**: 重写

---

#### Test 5: "should return false for Read tool"
**状态**: ❌ 同上
**建议**: 重写

---

#### Test 6: "should return false for Bash tool"
**状态**: ❌ 同上
**建议**: 重写

---

#### Test 7: "should return false for tool without file_path"
**状态**: ❌ 同上
**建议**: 重写

---

#### Test 8: "should return false for tool with non-string file_path"
**状态**: ❌ 同上 + 过度测试类型检查
**建议**: 删除

---

### describe: "extractFilePath"

#### Test 9: "should return relative path as-is"
**状态**: ❌ 测试复制的代码
**建议**: 重写

---

#### Test 10: "should convert absolute path within cwd to relative"
**状态**: ❌ 测试复制的代码 + mock process.cwd
**建议**: 重写

---

#### Test 11: "should return null for absolute path outside cwd"
**状态**: ❌ 测试复制的代码 + 过度测试异常
**建议**: 删除

---

#### Test 12: "should return null for non-string file_path"
**状态**: ❌ 测试复制的代码 + 过度测试类型
**建议**: 删除

---

#### Test 13: "should return null for missing file_path"
**状态**: ❌ 测试复制的代码 + 过度测试异常
**建议**: 删除

---

### describe: "shouldSyncFile"

#### Test 14: "should return file path for Edit tool usage"
**状态**: ❌ 测试复制的代码
**建议**: 重写

---

#### Test 15: "should return file path for Write tool usage"
**状态**: ❌ 测试复制的代码
**建议**: 重写

---

#### Test 16: "should return null for Read tool usage"
**状态**: ❌ 测试复制的代码
**建议**: 重写或删除（测试负面情况）

---

#### Test 17: "should return null for non-tool-use content"
**状态**: ❌ 测试复制的代码 + 过度测试
**建议**: 删除

---

#### Test 18: "should return null for system events"
**状态**: ❌ 测试复制的代码 + 过度测试
**建议**: 删除

---

#### Test 19: "should handle multiple tool uses and return first file modification"
**状态**: ❌ 测试复制的代码
**建议**: 重写 - 这个测试有一定价值

---

### describe: "real Claude output integration"

#### Test 20: "should correctly parse real Claude stream-json events"
**状态**: ❌ 测试复制的代码，但测试思路好
**建议**: 重写 - 使用真实函数

---

## 总结

- **总测试数**: 20
- **应该删除**: 9 (45%) - 过度测试类型和异常
- **应该重写**: 11 (55%) - 导入真实函数而不是复制代码

## 最终建议

**完全重写此文件**:
1. 删除所有复制的实现代码（line 5-64）
2. 从真实模块导入函数
3. 删除过度测试（类型检查、null返回等）
4. 保留核心功能测试（~11个测试）

**重写后应该只保留**:
- 基本工具识别测试（4个：Edit, Write, MultiEdit, NotebookEdit）
- 路径提取测试（2个：相对路径、绝对路径转换）
- 文件同步判断测试（3个：Edit, Write, 多工具）
- 集成测试（1个：真实Claude输出）

共约10个测试。
