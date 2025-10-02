# API share & shares routes 详细分析

## 1. POST /api/share (route.test.ts)

**文件路径**: `turbo/apps/web/app/api/share/route.test.ts`
**总测试数**: 6

### 测试分类表

| # | 测试名称 | 状态 | 分类 | 建议 |
|---|---------|------|------|------|
| 1 | should create share link for valid request | ✅ | 核心功能 | 保留 |
| 2 | should return 401 when not authenticated | ❌ | 异常测试 | 删除 |
| 3 | should return 400 for missing project_id | ❌ | schema validation | 删除 |
| 4 | should return 400 for missing file_path | ❌ | schema validation | 删除 |
| 5 | should return 404 for non-existent project | ❌ | 异常测试 | 删除 |
| 6 | should return 404 for different user's project | ⚠️ | 权限测试 | 可选保留 |

**建议**:
- **保留**: 1个 (test 1)
- **可选**: 1个 (test 6 - 如果需要额外验证权限)
- **删除**: 4个 (tests 2, 3, 4, 5)
- **简化后**: 从194行减少到约50-80行

---

## 2. GET /api/shares (route.test.ts)

**文件路径**: `turbo/apps/web/app/api/shares/route.test.ts`
**总测试数**: 4

### 测试分类表

| # | 测试名称 | 状态 | 分类 | 建议 |
|---|---------|------|------|------|
| 1 | should return empty array when user has no shares | ❌ | empty state | 删除 |
| 2 | should return user's shares with correct structure | ✅ | 核心功能 | 保留 |
| 3 | should not return shares from other users | ✅ | 用户隔离 | 保留 |
| 4 | should return 401 when not authenticated | ❌ | 异常测试 | 删除 |

**建议**:
- **保留**: 2个 (tests 2, 3)
- **删除**: 2个 (tests 1, 4)
- **简化后**: 从170行减少到约80行

---

## 总结

### POST /api/share
- **删除率**: 67-83%
- **核心保留**: 创建share功能

### GET /api/shares
- **删除率**: 50%
- **核心保留**: 查询shares + 用户隔离

### 两个文件合计
- **总测试数**: 10
- **应该删除**: 6-7 (60-70%)
- **应该保留**: 3-4 (30-40%)
