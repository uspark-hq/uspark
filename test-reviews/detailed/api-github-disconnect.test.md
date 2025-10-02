# API github/disconnect/route.test.ts 详细分析

**文件路径**: `turbo/apps/web/app/api/github/disconnect/route.test.ts`

## 快速总结

- **总测试数**: 5
- **应该删除**: 3 (60%) - 异常测试
- **应该保留**: 2 (40%) - 核心功能

## 测试分析

| # | 测试名称 | 状态 | 原因 |
|---|---------|------|------|
| 1 | returns 401 when not authenticated | ❌ 删除 | 过度测试异常 |
| 2 | returns 404 when no installation found | ❌ 删除 | 过度测试异常 |
| 3 | successfully disconnects...and deletes repos | ✅ 保留 | 核心功能+级联删除 |
| 4 | only disconnects current user's installation | ✅ 保留 | 用户隔离（重要） |
| 5 | handles case when installation has no repos | ❌ 删除 | 过度测试边界 |

**保留**: Test 3, 4
**删除**: Test 1, 2, 5
