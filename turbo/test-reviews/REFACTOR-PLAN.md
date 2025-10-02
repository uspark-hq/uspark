# 测试重构计划

## 🎯 当前进度总结

**更新时间**: 2025-10-02 (Batch 11 完成)

**总体进度**: 67% 完成 (35/52 文件)

| 阶段                  | 计划文件数  | 已完成      | 进度    | 测试变化       |
| --------------------- | ----------- | ----------- | ------- | -------------- |
| **Phase 1**           | 5 文件      | ✅ 5 文件   | 100%    | -10 tests      |
| **Phase 2 - API路由** | 29 文件     | ✅ 20 文件  | 69%     | -76 tests      |
| **Phase 2 - 组件**    | 15 文件     | ✅ 12 文件  | 80%     | -21 tests      |
| **Phase 2 - 库**      | 5 文件      | 🔄 1 文件   | 20%     | -1 test        |
| **Phase 2 - CLI**     | 3 文件      | ⏳ 0 文件   | 0%      | 0              |
| **总计**              | **57 文件** | **38 文件** | **67%** | **-108 tests** |

**测试统计**:

- 起始测试数: **444 tests**
- 当前测试数: **336 tests**
- 已删除: **108 tests (-24%)**
- 目标删除: **~177 tests (-40%)** (调整后的现实目标)
- 还需删除: **~69 tests**

### 📊 详细完成状态

#### ✅ Phase 1: 完全删除 (5/5 = 100%)

- ✅ 类型1: 无意义测试 (2 文件) - **100% 完成**
- ✅ 类型2: 复制代码 (2 文件) - **100% 完成**
- ✅ 类型3: Fake组件 (1 文件) - **100% 完成**

#### 🔄 Phase 2: 大幅简化 (24/52 = 46%)

**类型4: API异常测试** (20/29 = 69%):

- ✅ CLI Auth API (4/4 文件)
  - ✅ generate-token: 8→5 tests (-37.5%)
  - ✅ token-exchange: 8→2 tests (-75%)
  - ✅ tokens-list: 保留
  - ✅ device: 保留
- ✅ GitHub API (3/3 文件)
  - ✅ disconnect: 5→2 tests (-60%)
  - ✅ setup: 12→2 tests (-83%)
  - ✅ installation-status: 4→3 tests (-25%)
- ✅ Projects API (7/7 文件)
  - ✅ projects: 14→7 tests (-50%)
  - ✅ projects/[id]: 13→7 tests (-46%)
  - ✅ blob-token: 4→1 test (-75%)
  - ✅ share: 6→1 test (-83%)
  - ✅ shares: 4→3 tests (-25%)
  - ✅ shares/[id]: 5→4 tests (-20%)
  - ✅ share/[token]: 6→1 test (-83%)
- ✅ Sessions API (6/6 文件)
  - ✅ sessions: 10→6 tests (-40%)
  - ✅ sessions/[sessionId]: 5→2 tests (-60%)
  - ✅ sessions/[sessionId]/turns: 11→6 tests (-45%)
  - ✅ sessions/[sessionId]/interrupt: 6→3 tests (-50%)
  - ✅ sessions/[sessionId]/turns/[turnId]: 6→2 tests (-67%)
  - ✅ sessions/[sessionId]/updates: 10→7 tests (-30%)
- ✅ GitHub Repository API (3/3 文件)
  - ✅ repository: 8→4 tests (-50%)
  - ✅ sync: 4→2 tests (-50%)
- ⏳ 剩余 API 文件 (0/9 文件) - 未开始

**类型6 & 9: CSS和Empty/Loading/Error State测试** (12/15 = 80%):

- ✅ UI组件 (3/3 文件)
  - ✅ button.test.tsx: 删除 CSS class 测试
  - ✅ card.test.tsx: 删除 CSS class 测试
  - ✅ file-explorer.test.tsx: 删除 toHaveStyle() 测试
- ✅ Chat组件 (1/1 文件)
  - ✅ block-display.test.tsx: 删除 emoji 测试
- ✅ Settings组件 (2/2 文件) - Batch 9
  - ✅ shares/page.test.tsx: 删除 loading/empty/error + emoji tests (-5 tests)
  - ✅ github-connection.test.tsx: 删除整个文件 (全是 smoke tests, -6 tests)
- ✅ Chat & Explorer组件 (2/2 文件) - Batch 9
  - ✅ chat-interface.test.tsx: 删除 empty/polling state tests (-2 tests)
  - ✅ integration.test.tsx: 删除 error/empty state tests (-3 tests)
- ✅ Projects & Share页面 (2/2 文件) - Batch 10
  - ✅ projects/page.test.tsx: 删除 loading/error/empty tests (-3 tests)
  - ✅ share/[token]/page.test.tsx: 删除 loading/error tests (-4 tests)
- ✅ 其他组件 (2/2 文件) - 已检查,无需删除
  - ✅ yjs-parser.test.ts: 全是功能测试,保留
  - ✅ token-form.test.tsx: 全是功能测试,保留
- ⏳ 剩余组件文件 (0/3 文件) - 待处理
  - ⏳ projects/[id]/page.test.tsx
  - ⏳ file-explorer.test.tsx (可能有更多)
  - ⏳ 其他 UI 包组件

**类型7: Over-mocking** (1/5 = 20%):

- ✅ lib/github/client.test.ts - Batch 11: 删除 smoke test (-1 test)
- ✅ lib/github/auth.test.ts - 已检查,全是功能测试,保留
- ✅ lib/github/repository.test.ts - 已检查,全是功能测试,保留
- ✅ lib/github/sync.test.ts - 已检查,全是功能测试,保留
- ✅ lib/sessions/blocks.test.ts - 已检查,全是功能测试,保留

**类型8: Console输出** (0/3 = 0%):

- ⏳ cli/pull.test.ts
- ⏳ cli/push-multiple-blobs.test.ts
- ⏳ cli/commands/sync.test.ts

---

## 📋 目录

1. [Phase 1: 立即删除/重写](#phase-1-立即删除重写)
2. [Phase 2: 大幅简化](#phase-2-大幅简化)
3. [Phase 3: 轻微调整](#phase-3-轻微调整)
4. [重构Examples](#重构examples)

---

## Phase 1: 立即删除/重写 ✅ **已完成**

### 🗑️ 类型1: 完全无意义的测试 - 删除整个文件 ✅

**问题**: 测试硬编码常量或Node.js内置功能

**Example - Before**:

```typescript
// ❌ BAD: turbo/apps/cli/src/__tests__/index.test.ts
import { describe, it, expect } from "vitest";

describe("cli", () => {
  it("should have FOO constant", () => {
    const FOO = "hello";
    expect(FOO).toBe("hello");
  });

  it("should have process.version", () => {
    expect(typeof process.version).toBe("string");
  });
});
```

**Example - After**:

```bash
# 直接删除文件
rm turbo/apps/cli/src/__tests__/index.test.ts
```

**受影响文件 (2个)** ✅ **已完成**:

1. ✅ `turbo/apps/cli/src/__tests__/index.test.ts` - 已删除
2. ✅ `turbo/apps/web/app/components/claude-chat/__tests__/use-session-polling.test.tsx` - 已删除

---

### 🔄 类型2: 复制粘贴实现代码 - 重写整个文件 ✅

**问题**: 测试文件中复制了实现代码，而不是导入真实函数

**受影响文件 (2个)** ✅ **已完成**:

1. ✅ `turbo/apps/cli/src/__tests__/watch-claude.test.ts` - 已删除
2. ✅ `turbo/apps/web/app/settings/tokens/actions.test.ts` - 已删除

---

### 🎭 类型3: 测试Fake组件 - 删除或完全重写 ✅

**问题**: 创建假组件进行测试，而不是测试真实页面

**受影响文件 (1个)** ✅ **已完成**:

1. ✅ `turbo/apps/web/app/settings/tokens/page.test.tsx` - 已删除

---

## Phase 2: 大幅简化 🔄 **进行中 (46%)**

### ❌ 类型4: 过度测试异常逻辑 - 删除60-70% 🔄 **69% 完成**

**问题**: 大量测试401/404/400错误，这些应该由框架/中间件处理

**Example - Before**:

```typescript
// ❌ BAD: 每个API route都有这些测试
describe("POST /api/projects", () => {
  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 for missing name", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("should return 404 for non-existent project", async () => {
    const response = await GET(request, { params: { id: "999" } });
    expect(response.status).toBe(404);
  });

  // ✅ 唯一应该保留的测试
  it("should create project successfully", async () => {
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Test Project" });
  });
});
```

**Example - After**:

```typescript
// ✅ GOOD: 只测试核心业务逻辑
describe("POST /api/projects", () => {
  it("should create project successfully", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ name: "Test Project" }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({ name: "Test Project" });
  });

  it("should enforce project limit per user", async () => {
    // 创建业务逻辑测试，不是异常测试
    await createProjects(10); // 假设limit是10
    const response = await POST(request);
    expect(response.status).toBe(403); // 这是业务逻辑，不是框架异常
  });
});
```

**受影响文件 (29个 - 所有Web API Tests)** 🔄 **20/29 已完成**:

**CLI Auth API (4个)** ✅:

1. ✅ `turbo/apps/web/app/api/cli/auth/generate-token/route.test.ts` - 8→5 tests
2. ✅ `turbo/apps/web/app/api/cli/auth/token/route.test.ts` - 8→2 tests
3. ✅ `turbo/apps/web/app/api/cli/auth/tokens-list/route.test.ts` - 保留
4. ✅ `turbo/apps/web/app/api/cli/auth/device/route.test.ts` - 保留

**GitHub API (3个)** ✅: 5. ✅ `turbo/apps/web/app/api/github/disconnect/route.test.ts` - 5→2 tests 6. ✅ `turbo/apps/web/app/api/github/installation-status/route.test.ts` - 4→3 tests 7. ✅ `turbo/apps/web/app/api/github/setup/route.test.ts` - 12→2 tests

**Projects API (7个)** ✅: 8. ✅ `turbo/apps/web/app/api/projects/route.test.ts` - 14→7 tests 9. ✅ `turbo/apps/web/app/api/projects/[projectId]/route.test.ts` - 13→7 tests 10. ✅ `turbo/apps/web/app/api/projects/[projectId]/blob-token/route.test.ts` - 4→1 test 11. ✅ `turbo/apps/web/app/api/share/route.test.ts` - 6→1 test 12. ✅ `turbo/apps/web/app/api/shares/route.test.ts` - 4→3 tests 13. ✅ `turbo/apps/web/app/api/shares/[id]/route.test.ts` - 5→4 tests 14. ✅ `turbo/apps/web/app/api/share/[token]/route.test.ts` - 6→1 test

**Sessions API (6个)** ✅: 15. ✅ `turbo/apps/web/app/api/projects/[projectId]/sessions/route.test.ts` - 10→6 tests 16. ✅ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/route.test.ts` - 5→2 tests 17. ✅ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.test.ts` - 11→6 tests 18. ✅ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/interrupt/route.test.ts` - 6→3 tests 19. ✅ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/route.test.ts` - 6→2 tests 20. ✅ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/updates/route.test.ts` - 10→7 tests

**GitHub Repository API (3个)** ✅: 21. ✅ `turbo/apps/web/app/api/projects/[projectId]/github/repository/route.test.ts` - 8→4 tests 22. ✅ `turbo/apps/web/app/api/projects/[projectId]/github/sync/route.test.ts` - 4→2 tests

**剩余待处理 (6个)** ⏳: 23. ⏳ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/blocks/route.test.ts` 24. ⏳ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/chat/route.test.ts` 25. ⏳ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/title/route.test.ts` 26. ⏳ `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/summarize/route.test.ts` 27. ⏳ `turbo/apps/web/app/api/user/route.test.ts` 28. ⏳ `turbo/apps/web/app/api/sandbox/route.test.ts` 29. ⏳ `turbo/apps/web/app/api/webhooks/clerk/route.test.ts`

**删除规则**:

- ❌ 删除所有 `401 Unauthorized` 测试
- ❌ 删除所有 `404 Not Found` 测试（除非是业务逻辑）
- ❌ 删除所有 `400 Bad Request` schema validation测试
- ❌ 删除所有 `403 Forbidden` 用户隔离测试（除非是业务逻辑）
- ✅ 保留核心CRUD功能测试
- ✅ 保留业务逻辑测试（limits, pagination等）

---

### ❌ 类型5: 过度测试Schema Validation - 删除100% ✅

**说明**: 已在类型4中一并删除

---

### ❌ 类型6: 测试CSS和实现细节 - 删除100% 🔄 **27% 完成**

**问题**: 测试CSS class、样式、emoji等实现细节

**受影响文件 (15个)** 🔄 **4/15 已完成**:

**UI Package (3个)** ✅:

1. ✅ `turbo/packages/ui/src/components/ui/__tests__/button.test.tsx` - 已删除 CSS tests
2. ✅ `turbo/packages/ui/src/components/ui/__tests__/card.test.tsx` - 已删除 CSS tests
3. ⏳ `turbo/packages/ui/src/lib/__tests__/utils.test.ts`

**Component Tests (6个)** 🔄: 4. ✅ `turbo/apps/web/app/components/claude-chat/__tests__/block-display.test.tsx` - 已删除 emoji tests 5. ⏳ `turbo/apps/web/app/components/claude-chat/__tests__/chat-interface.test.tsx` 6. ✅ `turbo/apps/web/app/components/file-explorer/__tests__/file-explorer.test.tsx` - 已删除 toHaveStyle tests 7. ⏳ `turbo/apps/web/app/components/file-explorer/__tests__/integration.test.tsx` 8. ⏳ `turbo/apps/web/app/components/file-explorer/__tests__/yjs-parser.test.ts`

**Settings/Page Tests (6个)** ⏳: 9. ⏳ `turbo/apps/web/app/settings/shares/page.test.tsx` 10. ⏳ `turbo/apps/web/app/settings/github/page.test.tsx` 11. ⏳ `turbo/apps/web/app/settings/github/github-connection.test.tsx` 12. ⏳ `turbo/apps/web/app/settings/tokens/token-form.test.tsx` 13. ⏳ `turbo/apps/web/app/projects/page.test.tsx` 14. ⏳ `turbo/apps/web/app/projects/[id]/page.test.tsx` 15. ⏳ `turbo/apps/web/app/share/[token]/page.test.tsx`

**删除规则**:

- ❌ 删除所有 `toHaveClass()` 测试
- ❌ 删除所有 `toHaveStyle()` 测试
- ❌ 删除所有测试emoji的测试
- ❌ 删除所有测试具体文案的测试
- ❌ 删除所有测试CSS颜色、尺寸的测试

---

### ❌ 类型7: 过度Mock - 删除或简化 ⏳ **未开始**

**问题**: Mock整个依赖模块，测试变成检查mock是否被调用

**受影响文件 (5个 Library Tests)** ⏳:

1. ⏳ `turbo/apps/web/src/lib/github/__tests__/client.test.ts` - 删除60-70%
2. ⏳ `turbo/apps/web/src/lib/github/__tests__/auth.test.ts` - 删除60-70%
3. ⏳ `turbo/apps/web/src/lib/github/__tests__/repository.test.ts` - 删除60-70%
4. ⏳ `turbo/apps/web/src/lib/github/__tests__/sync.test.ts` - 删除60-70%
5. ⏳ `turbo/apps/web/src/lib/sessions/__tests__/blocks.test.ts` - 删除60-70%

**删除规则**:

- ❌ 删除只检查 `toBeDefined()` 的测试
- ❌ 删除只检查mock被调用的测试
- ❌ 简化过度mock，使用MSW或真实API
- ✅ 保留测试真实业务逻辑的测试

---

### ❌ 类型8: 测试控制台输出 - 删除100% ⏳ **未开始**

**问题**: 测试console.log/console.error输出

**受影响文件 (3个 CLI Tests)** ⏳:

1. ⏳ `turbo/apps/cli/src/__tests__/pull.test.ts` - 删除console测试
2. ⏳ `turbo/apps/cli/src/__tests__/push-multiple-blobs.test.ts` - 删除console测试
3. ⏳ `turbo/apps/cli/src/commands/__tests__/sync.test.ts` - 删除console测试

**删除规则**:

- ❌ 删除所有 `vi.spyOn(console, "log")` 测试
- ❌ 删除所有 `vi.spyOn(console, "error")` 测试
- ❌ 删除所有测试具体error message的测试
- ✅ 保留测试返回值和副作用的测试

---

### ❌ 类型9: 测试空状态和边界 - 删除100% ⏳ **未开始**

**问题**: 测试empty state, loading state, error state

**受影响文件**: 所有Component和Page测试（约15个）⏳

**删除规则**:

- ❌ 删除所有 `loading` state 测试
- ❌ 删除所有 `empty` state 测试
- ❌ 删除所有 `error` state 测试
- ❌ 删除所有 `fallback` 测试
- ✅ 保留核心渲染和交互测试

---

## Phase 3: 轻微调整 ⏳ **未开始**

### ✅ 类型10: 高质量测试 - 保留90%+

**Example - 好的测试**:

```typescript
// ✅ GOOD: Workspace tests - 简单直接的单元测试
describe("SignalPromise", () => {
  it("should resolve with value", async () => {
    const promise = new SignalPromise<number>();
    promise.resolve(42);
    expect(await promise).toBe(42);
  });
});

// ✅ GOOD: Core tests - 测试核心功能
describe("BlobFactory", () => {
  it("should create Vercel blob storage when token provided", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    const storage = BlobFactory.create();
    expect(storage).toBeInstanceOf(VercelBlobStorage);
  });
});
```

**受影响文件 (21个 - 轻微调整)** ⏳:

**Core Tests (10个)** - 保留60-70%:

1. ⏳ `turbo/packages/core/blob/__tests__/factory.test.ts`
2. ⏳ `turbo/packages/core/blob/__tests__/memory-blob-storage.test.ts`
3. ⏳ `turbo/packages/core/blob/__tests__/vercel-blob-storage.test.ts`
4. ⏳ `turbo/packages/core/blob/__tests__/utils.test.ts`
5. ⏳ `turbo/packages/core/__tests__/contract-fetch.test.ts`
6. ⏳ `turbo/packages/core/__tests__/contract-fetch-simple.test.ts`
7. ⏳ `turbo/packages/core/contracts/__tests__/share.contract.test.ts`

---

## 📊 重构统计总结

### 按Phase分类

| Phase                  | 文件数 | 已完成 | 进度    | 删除率     | 操作           |
| ---------------------- | ------ | ------ | ------- | ---------- | -------------- |
| Phase 1: 立即删除/重写 | 5      | ✅ 5   | 100%    | 80-100%    | 删除或完全重写 |
| Phase 2: 大幅简化      | 52     | 🔄 24  | 46%     | 60-70%     | 删除过度测试   |
| Phase 3: 轻微调整      | 21     | ⏳ 0   | 0%      | 10-40%     | 保留大部分     |
| **总计**               | **78** | **29** | **37%** | **60-65%** |                |

### 按问题类型分类

| 类型           | 文件数 | 已完成 | 进度 | 删除率 | 优先级 |
| -------------- | ------ | ------ | ---- | ------ | ------ |
| 1. 无意义测试  | 2      | ✅ 2   | 100% | 100%   | P0     |
| 2. 复制代码    | 2      | ✅ 2   | 100% | 80%    | P0     |
| 3. Fake组件    | 1      | ✅ 1   | 100% | 90%+   | P0     |
| 4. 异常测试    | 29     | 🔄 20  | 69%  | 60-70% | P1     |
| 5. Schema测试  | 29     | ✅ 29  | 100% | 100%   | P1     |
| 6. CSS测试     | 15     | 🔄 4   | 27%  | 60-70% | P1     |
| 7. 过度Mock    | 5      | ⏳ 0   | 0%   | 60-70% | P1     |
| 8. Console测试 | 3      | ⏳ 0   | 0%   | 100%   | P2     |
| 9. 空状态测试  | 15     | ⏳ 0   | 0%   | 100%   | P2     |
| 10. 高质量测试 | 21     | ⏳ 0   | 0%   | 10-20% | P3     |

---

## 🚀 执行步骤

### ✅ Step 1: 备份现有测试

```bash
git checkout -b docs/test-review-and-refactor-plan
```

### ✅ Step 2: Phase 1 执行（已完成）

- ✅ 删除无意义测试 (2 文件)
- ✅ 删除复制代码测试 (2 文件)
- ✅ 删除fake组件测试 (1 文件)

### 🔄 Step 3: Phase 2 执行（进行中 46%）

- ✅ 删除API tests中的异常测试 (20/29 文件)
- 🔄 删除Component tests中的CSS测试 (4/15 文件)
- ⏳ 简化Library tests中的过度mock (0/5 文件)
- ⏳ 删除CLI tests中的console测试 (0/3 文件)

### ⏳ Step 4: Phase 3 执行（未开始）

- ⏳ 轻微调整高质量测试
- ⏳ 删除少量边界测试

### Step 5: 验证

```bash
cd turbo
pnpm vitest
```

### Step 6: 提交

```bash
git add .
git commit -m "test: remove over-tested and fake tests (60-65% reduction)"
```

---

## 📋 Checklist

### Phase 1 Checklist ✅

- [x] 删除 `cli/index.test.ts`
- [x] 删除 `use-session-polling.test.tsx`
- [x] 删除 `watch-claude.test.ts`
- [x] 删除 `settings/tokens/actions.test.ts`
- [x] 删除fake组件测试

### Phase 2 Checklist 🔄

- [x] 删除20个API tests中的异常测试 (20/29)
- [x] 删除4个Component/UI tests中的CSS测试 (4/15)
- [ ] 删除剩余9个API tests中的异常测试
- [ ] 删除剩余11个Component tests中的CSS测试
- [ ] 删除5个Library tests中的过度mock
- [ ] 删除3个CLI tests中的console测试

### Phase 3 Checklist ⏳

- [ ] 调整21个高质量测试
- [ ] 删除少量边界测试
- [ ] 运行全部测试确保通过
- [ ] 提交代码

---

## 预期结果

- ✅ **测试文件数**: 74 → 74 (保留文件，但大幅精简内容)
- 🔄 **测试数量**: ~444 → ~358 (当前) → ~270 (目标) (减少60-65%)
- 🔄 **代码行数**: 已减少约19%
- 🔄 **测试执行时间**: TBD
- ✅ **可维护性**: 显著提升
- ✅ **可信度**: 显著提升（删除假测试）

**下一步**: 继续Phase 2，完成剩余的组件CSS测试、库over-mocking测试和CLI console测试的简化。
