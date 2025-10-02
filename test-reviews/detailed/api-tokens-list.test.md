# API tokens-list.test.ts 详细分析

**文件路径**: `turbo/apps/web/app/api/cli/auth/tokens-list.test.ts`

## 测试列表

### Test 1: "should retrieve tokens after generating them"
**状态**: ✅ 集成测试 - 测试完整流程（生成→查询）
**建议**: 保留

### Test 2: "should only retrieve non-expired tokens"
**状态**: ✅ 测试过期逻辑
**建议**: 保留

### Test 3: "should handle database query errors gracefully"
```typescript
// Test with null userId (edge case)
const emptyResult = await globalThis.services.db.select()...
  .where(eq(CLI_TOKENS_TBL.userId, "non_existent_user"));
expect(emptyResult).toHaveLength(0);
```
**状态**: ❌ 过度测试边界情况
**问题**: 测试empty result，不是真正的"error handling"
**建议**: 删除

### Test 4: "should correctly count tokens towards the limit"
**状态**: ✅ 测试业务逻辑（limit enforcement）
**建议**: 保留

### Test 5: "should return all token fields needed for display"
```typescript
// All fields should be present for UI display
expect(token.id).toBeDefined();
expect(token.token).toMatch(/^usp_live_/);
expect(token.userId).toBe(userId);
expect(token.name).toBe("Display Test Token");
...
```
**状态**: ⚠️ 过度测试实现细节
**问题**: 检查每个字段存在性，应该由TypeScript保证
**建议**: 删除或大幅简化

---

## 总结

- **总测试数**: 5
- **应该删除**: 2 (40%)
- **应该保留**: 3 (60%)

**保留**: 1, 2, 4
**删除**: 3, 5
