# TODO List

## API Issues

### ✅ RESOLVED: GET /api/projects/:projectId 不应该有 upsert 逻辑

**位置**: `turbo/apps/web/app/api/projects/[projectId]/route.ts:16`
**解决日期**: 2025-10-25
**PR/Commit**: Fixed in current session

**问题描述**:
当前实现中，如果项目不存在，会自动创建一个新的空 YDoc 项目，违反了 GET 请求的幂等性原则。

**解决方案**:
已修改 GET handler，移除了 upsert 逻辑，现在当项目不存在时返回 404：

```typescript
if (!project) {
  return NextResponse.json(
    { error: "project_not_found" },
    { status: 404 },
  );
}

// 返回现有项目数据
const binaryData = Buffer.from(project.ydocData, "base64");
return new Response(binaryData, {
  headers: {
    "Content-Type": "application/octet-stream",
    "X-Version": project.version.toString(),
    "Access-Control-Expose-Headers": "X-Version",
  },
});
```

**测试更新**:
- ✅ 添加新测试：`should return 404 when project doesn't exist`
- ✅ 验证项目未被创建
- ✅ 所有现有测试继续通过（7/7 tests passed）

**影响分析**:
- ✅ 客户端代码（yjs-file-explorer.tsx）已正确处理 404 错误
- ✅ 项目创建已通过 POST /api/projects 进行
- ✅ 符合 REST API 最佳实践

**优先级**: ~~Medium~~ **COMPLETED**

---

## 订阅 YJS 修改的实时同步机制

### 当前状态

**位置**: `turbo/apps/web/app/components/file-explorer/yjs-file-explorer.tsx:88`

**当前实现**: 简单的客户端轮询（Polling）

```typescript
// 每 3 秒轮询一次
const pollInterval = setInterval(() => loadProjectFiles(false), 3000);
```

**问题**:
- ❌ 延迟高: 最多 3 秒才能看到更新
- ❌ 浪费资源: 即使没有变化也要发送请求
- ❌ 可扩展性差: 客户端越多，服务器负载越高

### 规划设计

**文档位置**: `spec/archived/polling-system.md`

**设计方案**: Long Polling 系统

核心 API:
```http
GET /api/projects/:projectId/updates?version={clientVersion}&timeout=30000
```

**工作原理**:
- 如果 `clientVersion < currentVersion`: 立即返回增量更新
- 如果 `clientVersion === currentVersion`: 等待更新或超时（30秒）
- 超时后返回 204，客户端立即重连

**优势**:
- ✅ 低延迟: < 100ms
- ✅ 高效: 只在有更新时才传输数据
- ✅ 可扩展: 请求数量大幅减少（从 20/min → 2/min）

### 可选方案对比

| 方案 | 延迟 | 复杂度 | 资源消耗 | 实时性 |
|-----|------|--------|---------|--------|
| **Client Polling** (当前) | 2-3s | 简单 | 高 | 差 |
| **Long Polling** (规划) | <100ms | 中等 | 低 | 好 |
| **WebSocket** | <50ms | 复杂 | 中 | 优秀 |
| **Server-Sent Events (SSE)** | <100ms | 中等 | 低 | 好 |

### 实施建议

**短期**: 保持当前轮询机制（简单可靠）
**中期**: 实施 Long Polling（平衡性能和复杂度）
**长期**: 考虑 WebSocket（多人实时协同编辑场景）

**优先级**: Low（当前功能可用，优化非紧急）

---
