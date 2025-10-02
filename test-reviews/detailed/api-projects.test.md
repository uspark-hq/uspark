# API projects/route.test.ts 详细分析

**文件路径**: `turbo/apps/web/app/api/projects/route.test.ts`

## 快速分析 (257行, 12个测试)

### 测试分类表

| # | 测试名称 | 状态 | 分类 | 建议 |
|---|---------|------|------|------|
| **GET /api/projects** ||||
| 1 | should return 401 when not authenticated | ❌ | 异常测试 | 删除 |
| 2 | should return empty list when user has no projects | ❌ | empty state | 删除 |
| 3 | should return user's projects list | ✅ | 核心功能 | 保留 |
| 4 | should only return projects for the correct user | ✅ | 用户隔离 | 保留 |
| **POST /api/projects** ||||
| 5 | should return 401 when not authenticated | ❌ | 异常测试 | 删除 |
| 6 | should create a new project successfully | ✅ | 核心功能 | 保留 |
| 7 | should validate request body with schema | ❌ | schema validation | 删除 |
| 8 | should reject empty name | ❌ | schema validation | 删除 |
| 9 | should reject name that is too long | ❌ | schema validation | 删除 |
| 10 | should reject non-string name | ❌ | schema validation | 删除 |
| 11 | should handle invalid JSON | ❌ | 异常测试 | 删除 |
| 12 | should generate unique project IDs | ✅ | 核心功能 | 保留 |

---

## 总结

- **总测试数**: 12
- **应该删除**: 8 (67%) - 异常和schema validation
- **应该保留**: 4 (33%) - 核心功能和用户隔离

---

## 最终建议

**保留的测试** (4个):
1. GET: "should return user's projects list"
2. GET: "should only return projects for the correct user"
3. POST: "should create a new project successfully"
4. POST: "should generate unique project IDs"

**删除的测试** (8个):
- 2个401测试
- 1个empty list测试
- 4个schema validation测试
- 1个invalid JSON测试

**简化后**: 文件从257行减少到约100行 (减少60%)。
