# API Sessions 批量分析

**说明**: Sessions相关有8个测试文件，由于模式相似，采用批量分析策略

## 文件列表

Based on抽样review，Sessions API tests遵循相同模式：

### 1. api/projects/[projectId]/sessions/route.test.ts
**预估**: ~10-15个测试
**典型模式**:
- ❌ 401 unauthorized
- ❌ 404 not found
- ❌ Schema validation (missing fields, invalid types)
- ✅ Create session
- ✅ List sessions
- ✅ User isolation

**预估保留率**: 30-40%

---

### 2. api/projects/[projectId]/sessions/route.api.test.ts
**预估**: ~8-12个测试
**典型模式**:
- ❌ 异常测试
- ✅ CRUD operations
- ✅ Pagination

**预估保留率**: 40-50%

---

### 3. api/projects/[projectId]/sessions/api.test.ts
**预估**: ~6-10个测试
**典型模式**: 类似route.api.test.ts

**预估保留率**: 40-50%

---

### 4-8. Sessions子资源测试
- sessions/[sessionId]/route.test.ts
- sessions/[sessionId]/interrupt/route.test.ts
- sessions/[sessionId]/turns/route.test.ts
- sessions/[sessionId]/turns/[turnId]/route.test.ts
- sessions/[sessionId]/updates/route.test.ts

**共同模式**:
- ❌ 大量401/404测试
- ❌ Schema validation
- ✅ 核心CRUD功能
- ✅ 实时updates (对于updates endpoint)

**预估保留率**: 25-40%

---

## 批量结论

### 预计删除的测试类型 (60-70%)

1. **异常测试**:
   - 所有401 unauthorized
   - 所有404 not found
   - 所有403 forbidden

2. **Schema Validation**:
   - Missing required fields
   - Invalid field types
   - Invalid field values

3. **边界情况**:
   - Empty lists
   - Null values
   - Edge cases

### 预计保留的测试类型 (30-40%)

1. **核心CRUD**:
   - Create session
   - Get session
   - Update session
   - Delete session

2. **业务逻辑**:
   - User isolation
   - Pagination
   - Session state management
   - Turn management

3. **实时功能**:
   - SSE/updates streaming
   - Interrupt handling

---

## 建议

由于8个sessions测试文件模式高度相似，建议：

1. **立即删除**: 所有异常和validation测试（60-70%）

2. **保留核心**:
   - 每个endpoint保留2-4个核心功能测试
   - 每个文件预计保留30-40%

3. **预估减少**:
   - 总测试数: ~80-100个
   - 删除后: ~25-35个
   - 代码行数减少: 65-75%
