# 测试重构计划

## 📋 目录

1. [Phase 1: 立即删除/重写](#phase-1-立即删除重写)
2. [Phase 2: 大幅简化](#phase-2-大幅简化)
3. [Phase 3: 轻微调整](#phase-3-轻微调整)
4. [重构Examples](#重构examples)

---

## Phase 1: 立即删除/重写

### 🗑️ 类型1: 完全无意义的测试 - 删除整个文件

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

**受影响文件 (2个)**:
1. ✅ `turbo/apps/cli/src/__tests__/index.test.ts` - 删除
2. ✅ `turbo/apps/web/app/(authenticated)/components/use-session-polling.test.tsx` - 删除

---

### 🔄 类型2: 复制粘贴实现代码 - 重写整个文件

**问题**: 测试文件中复制了实现代码，而不是导入真实函数

**Example - Before**:
```typescript
// ❌ BAD: turbo/apps/cli/src/__tests__/watch-claude.test.ts
import { describe, it, expect } from "vitest";

// 复制粘贴的实现代码！
function isFileModificationTool(tool: { name: string; input: unknown }) {
  const fileModTools = ["str_replace_editor", "write_to_file"];
  return fileModTools.includes(tool.name);
}

function extractFilePath(tool: { input: { path?: string; file_path?: string } }) {
  return tool.input.path || tool.input.file_path;
}

describe("watch-claude utils", () => {
  it("should detect file modification tools", () => {
    expect(isFileModificationTool({ name: "str_replace_editor", input: {} })).toBe(true);
  });

  it("should extract file path", () => {
    expect(extractFilePath({ input: { path: "/foo/bar" } })).toBe("/foo/bar");
  });
});
```

**Example - After**:
```typescript
// ✅ GOOD: 导入真实函数进行测试
import { describe, it, expect } from "vitest";
import { isFileModificationTool, extractFilePath } from "../watch-claude"; // 导入真实实现

describe("watch-claude utils", () => {
  it("should detect file modification tools", () => {
    expect(isFileModificationTool({ name: "str_replace_editor", input: {} })).toBe(true);
  });

  it("should extract file path", () => {
    expect(extractFilePath({ input: { path: "/foo/bar" } })).toBe("/foo/bar");
  });
});
```

**受影响文件 (2个)**:
1. ✅ `turbo/apps/cli/src/__tests__/watch-claude.test.ts` - 重写
2. ✅ `turbo/apps/web/app/(authenticated)/settings/tokens/actions.test.ts` - 重写

**重写步骤**:
1. 删除所有复制的代码
2. 从真实文件导入函数
3. 确保测试仍然通过
4. 删除过度测试（异常、边界等）

---

### 🎭 类型3: 测试Fake组件 - 删除或完全重写

**问题**: 创建假组件进行测试，而不是测试真实页面

**Example - Before**:
```typescript
// ❌ BAD: turbo/apps/web/app/(authenticated)/settings/tokens/page.test.tsx
import { render, screen } from "@testing-library/react";

// 创建假组件！
function TestTokensPage() {
  return (
    <div>
      <h1>CLI Tokens</h1>
      <button>Create Token</button>
    </div>
  );
}

describe("TokensPage", () => {
  it("should render heading", () => {
    render(<TestTokensPage />);
    expect(screen.getByText("CLI Tokens")).toBeInTheDocument();
  });

  it("should render create button", () => {
    render(<TestTokensPage />);
    expect(screen.getByText("Create Token")).toBeInTheDocument();
  });
});
```

**Example - After (选项1: 删除)**:
```bash
# 如果页面已有E2E测试，直接删除
rm turbo/apps/web/app/(authenticated)/settings/tokens/page.test.tsx
```

**Example - After (选项2: 测试真实组件)**:
```typescript
// ✅ GOOD: 测试真实页面
import { render, screen } from "@testing-library/react";
import TokensPage from "./page"; // 导入真实页面

describe("TokensPage", () => {
  it("should allow creating and managing tokens", async () => {
    render(<TokensPage />);

    // 测试真实功能，不是假UI
    const createButton = screen.getByRole("button", { name: /create/i });
    await userEvent.click(createButton);

    // 测试实际业务逻辑
    expect(await screen.findByText(/token created/i)).toBeInTheDocument();
  });
});
```

**受影响文件 (需要人工确认) (4-8个)**:

**确认是Fake组件**:
1. ⚠️ `turbo/apps/web/app/(authenticated)/settings/tokens/page.test.tsx` - 已确认fake

**需要检查**:
2. ⚠️ `turbo/apps/web/app/(authenticated)/projects/page.test.tsx`
3. ⚠️ `turbo/apps/web/app/(authenticated)/projects/[id]/page.test.tsx`
4. ⚠️ `turbo/apps/web/app/(authenticated)/share/[token]/page.test.tsx`
5. ⚠️ `turbo/apps/web/app/(authenticated)/settings/shares/page.test.tsx`
6. ⚠️ `turbo/apps/web/app/(authenticated)/settings/github/page.test.tsx`

**检查方法**:
```bash
# 在每个文件中搜索 "function Test" 或 "const Test"
grep -n "function Test\|const Test.*Page\|const Test.*Component" turbo/apps/web/app/(authenticated)/projects/page.test.tsx
```

---

## Phase 2: 大幅简化

### ❌ 类型4: 过度测试异常逻辑 - 删除60-70%

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
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "" })
    }));
    expect(response.status).toBe(400);
  });

  it("should return 404 for non-existent project", async () => {
    const response = await GET(request, { params: { id: "999" } });
    expect(response.status).toBe(404);
  });

  it("should return 403 when accessing other user's project", async () => {
    const response = await GET(request, { params: { id: "other-user-project" } });
    expect(response.status).toBe(403);
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
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project" })
    }));

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

**受影响文件 (29个 - 所有Web API Tests)**:

**CLI Auth API (4个)**:
1. `turbo/apps/web/app/api/cli/auth/generate-token/route.test.ts` - 删除37.5%
2. `turbo/apps/web/app/api/cli/auth/token/route.test.ts` - 删除75%
3. `turbo/apps/web/app/api/cli/auth/tokens-list/route.test.ts` - 删除40%
4. `turbo/apps/web/app/api/cli/auth/device/route.test.ts` - 简化33%

**GitHub API (3个)**:
5. `turbo/apps/web/app/api/github/disconnect/route.test.ts` - 删除60%
6. `turbo/apps/web/app/api/github/installation-status/route.test.ts` - 删除50%
7. `turbo/apps/web/app/api/github/setup/route.test.ts` - 删除67-83%

**Projects API (2个)**:
8. `turbo/apps/web/app/api/projects/route.test.ts` - 删除67%
9. `turbo/apps/web/app/api/projects/[projectId]/blob-token/route.test.ts` - 删除75%

**Share API (2个)**:
10. `turbo/apps/web/app/api/share/[token]/route.test.ts` - 删除60%
11. `turbo/apps/web/app/api/shares/route.test.ts` - 删除70%

**Sessions API (8个)**:
12. `turbo/apps/web/app/api/projects/[projectId]/sessions/route.test.ts` - 删除60-70%
13. `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/route.test.ts` - 删除60-70%
14. `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.test.ts` - 删除60-70%
15. `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/route.test.ts` - 删除60-70%
16. `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/[turnId]/blocks/route.test.ts` - 删除60-70%
17. `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/chat/route.test.ts` - 删除60-70%
18. `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/title/route.test.ts` - 删除60-70%
19. `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/summarize/route.test.ts` - 删除60-70%

**其他API Routes (4个)**:
20. `turbo/apps/web/app/api/user/route.test.ts` - 删除60-65%
21. `turbo/apps/web/app/api/sandbox/route.test.ts` - 删除60-65%
22. `turbo/apps/web/app/api/webhooks/clerk/route.test.ts` - 删除60-65%
23. `turbo/apps/web/app/api/health/route.test.ts` - 删除60-65%

**Settings Actions (6个)**:
24. `turbo/apps/web/app/(authenticated)/settings/shares/actions.test.ts` - 删除60-70%
25. `turbo/apps/web/app/(authenticated)/settings/github/actions.test.ts` - 删除60-70%
26. `turbo/apps/web/app/(authenticated)/settings/profile/actions.test.ts` - 删除60-70%

**删除规则**:
- ❌ 删除所有 `401 Unauthorized` 测试
- ❌ 删除所有 `404 Not Found` 测试（除非是业务逻辑）
- ❌ 删除所有 `400 Bad Request` schema validation测试
- ❌ 删除所有 `403 Forbidden` 用户隔离测试（除非是业务逻辑）
- ✅ 保留核心CRUD功能测试
- ✅ 保留业务逻辑测试（limits, pagination等）

---

### ❌ 类型5: 过度测试Schema Validation - 删除100%

**问题**: 重复测试Zod库的功能

**Example - Before**:
```typescript
// ❌ BAD: 测试Zod的功能
describe("POST /api/projects", () => {
  it("should reject empty name", async () => {
    const response = await POST(makeRequest({ name: "" }));
    expect(response.status).toBe(400);
  });

  it("should reject name too long", async () => {
    const response = await POST(makeRequest({ name: "a".repeat(256) }));
    expect(response.status).toBe(400);
  });

  it("should reject invalid type for name", async () => {
    const response = await POST(makeRequest({ name: 123 }));
    expect(response.status).toBe(400);
  });

  it("should reject missing required field", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });
});
```

**Example - After**:
```typescript
// ✅ GOOD: 完全删除这些测试，Zod已经测试过了
describe("POST /api/projects", () => {
  // Schema validation测试全部删除

  // 只保留业务逻辑
  it("should create project successfully", async () => {
    const response = await POST(makeRequest({ name: "Test Project" }));
    expect(response.status).toBe(200);
  });
});
```

**受影响文件**: 同上29个API测试文件

**删除规则**:
- ❌ 删除所有 `empty string` 测试
- ❌ 删除所有 `too long` 测试
- ❌ 删除所有 `invalid type` 测试
- ❌ 删除所有 `missing required field` 测试
- ❌ 删除所有 `invalid format` 测试（email, url等）

---

### ❌ 类型6: 测试CSS和实现细节 - 删除100%

**问题**: 测试CSS class、样式、emoji等实现细节

**Example - Before**:
```typescript
// ❌ BAD: 测试CSS class
describe("Button", () => {
  it("should have destructive styles", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
    expect(button).toHaveClass("text-destructive-foreground");
  });

  it("should have correct size", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });
});

// ❌ BAD: 测试emoji
describe("BlockDisplay", () => {
  it("should show thinking emoji", () => {
    render(<BlockDisplay type="thinking" />);
    expect(screen.getByText("💭")).toBeInTheDocument();
  });

  it("should show tool emoji", () => {
    render(<BlockDisplay type="tool" />);
    expect(screen.getByText("🔧")).toBeInTheDocument();
  });
});

// ❌ BAD: 测试具体样式
describe("FileExplorer", () => {
  it("should highlight selected file", () => {
    render(<FileExplorer selectedPath="/foo.ts" />);
    const file = screen.getByText("foo.ts");
    expect(file).toHaveStyle("border-left: 3px solid #3b82f6");
  });
});
```

**Example - After**:
```typescript
// ✅ GOOD: 测试功能，不测试样式
describe("Button", () => {
  it("should be clickable when not disabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("should not be clickable when disabled", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ✅ GOOD: 测试不同类型的渲染，不测试emoji
describe("BlockDisplay", () => {
  it("should render different block types", () => {
    const { rerender } = render(<BlockDisplay type="thinking" content="..." />);
    expect(screen.getByText("...")).toBeInTheDocument();

    rerender(<BlockDisplay type="tool" content="tool output" />);
    expect(screen.getByText("tool output")).toBeInTheDocument();
  });
});

// ✅ GOOD: 测试选择功能，不测试CSS
describe("FileExplorer", () => {
  it("should call onSelect when file is clicked", () => {
    const onSelect = vi.fn();
    render(<FileExplorer onFileSelect={onSelect} />);
    fireEvent.click(screen.getByText("foo.ts"));
    expect(onSelect).toHaveBeenCalledWith("/foo.ts");
  });
});
```

**受影响文件 (15个)**:

**UI Package (3个)**:
1. `turbo/packages/ui/src/components/ui/__tests__/button.test.tsx` - 删除60-70%
2. `turbo/packages/ui/src/components/ui/__tests__/card.test.tsx` - 删除60-70%
3. `turbo/packages/ui/src/lib/__tests__/utils.test.ts` - 删除30-40%

**Component Tests (6个)**:
4. `turbo/apps/web/app/(authenticated)/components/claude-chat/__tests__/block-display.test.tsx` - 删除60%
5. `turbo/apps/web/app/(authenticated)/components/claude-chat/__tests__/chat-interface.test.tsx` - 删除30-40%
6. `turbo/apps/web/app/(authenticated)/components/file-explorer/__tests__/file-explorer.test.tsx` - 删除50%
7. `turbo/apps/web/app/(authenticated)/components/file-explorer/__tests__/integration.test.tsx` - 删除60%
8. `turbo/apps/web/app/(authenticated)/components/file-explorer/__tests__/yjs-parser.test.ts` - 删除30%

**Settings/Page Tests (6个)**:
9. `turbo/apps/web/app/(authenticated)/settings/shares/page.test.tsx` - 删除60%
10. `turbo/apps/web/app/(authenticated)/settings/github/page.test.tsx` - 删除60%
11. `turbo/apps/web/app/(authenticated)/settings/profile/page.test.tsx` - 删除60%

**删除规则**:
- ❌ 删除所有 `toHaveClass()` 测试
- ❌ 删除所有 `toHaveStyle()` 测试
- ❌ 删除所有测试emoji的测试
- ❌ 删除所有测试具体文案的测试
- ❌ 删除所有测试CSS颜色、尺寸的测试

---

### ❌ 类型7: 过度Mock - 删除或简化

**问题**: Mock整个依赖模块，测试变成检查mock是否被调用

**Example - Before**:
```typescript
// ❌ BAD: Mock整个依赖
import { vi } from "vitest";
import * as octokitModule from "@octokit/rest";

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    repos: {
      get: vi.fn().mockResolvedValue({ data: { name: "test" } }),
      listBranches: vi.fn().mockResolvedValue({ data: [] }),
    },
    users: {
      getAuthenticated: vi.fn().mockResolvedValue({ data: { login: "user" } }),
    },
  })),
}));

describe("GitHubClient", () => {
  it("should initialize", () => {
    const client = new GitHubClient("token");
    expect(client).toBeDefined(); // 无意义的测试
  });

  it("should get repo", async () => {
    const client = new GitHubClient("token");
    const repo = await client.getRepo("owner", "repo");
    expect(repo).toBeDefined(); // 只测试mock
  });
});
```

**Example - After (选项1: 删除过度mock)**:
```typescript
// ✅ GOOD: 使用真实API或nock
import nock from "nock";

describe("GitHubClient", () => {
  it("should get repo information", async () => {
    // 使用nock模拟HTTP响应，不是mock整个模块
    nock("https://api.github.com")
      .get("/repos/owner/repo")
      .reply(200, { name: "repo", stars: 100 });

    const client = new GitHubClient("token");
    const repo = await client.getRepo("owner", "repo");

    // 测试真实逻辑
    expect(repo.name).toBe("repo");
    expect(repo.stars).toBe(100);
  });
});
```

**Example - After (选项2: 使用真实测试环境)**:
```typescript
// ✅ BETTER: 使用真实GitHub测试账号
describe("GitHubClient", () => {
  it("should get repo information", async () => {
    const client = new GitHubClient(process.env.GITHUB_TEST_TOKEN);
    const repo = await client.getRepo("test-org", "test-repo");

    // 测试真实API
    expect(repo.name).toBe("test-repo");
  });
});
```

**受影响文件 (5个 Library Tests)**:
1. `turbo/apps/web/lib/github/__tests__/client.test.ts` - 删除60-70%
2. `turbo/apps/web/lib/github/__tests__/auth.test.ts` - 删除60-70%
3. `turbo/apps/web/lib/github/__tests__/repository.test.ts` - 删除60-70%
4. `turbo/apps/web/lib/github/__tests__/sync.test.ts` - 删除60-70%
5. `turbo/apps/web/lib/sessions/__tests__/blocks.test.ts` - 删除60-70%

**删除规则**:
- ❌ 删除只检查 `toBeDefined()` 的测试
- ❌ 删除只检查mock被调用的测试
- ❌ 简化过度mock，使用nock或真实API
- ✅ 保留测试真实业务逻辑的测试

---

### ❌ 类型8: 测试控制台输出 - 删除100%

**问题**: 测试console.log/console.error输出

**Example - Before**:
```typescript
// ❌ BAD: 测试console输出
describe("sync command", () => {
  it("should log sync started", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    await sync({ projectId: "123" });
    expect(consoleSpy).toHaveBeenCalledWith("Sync started...");
  });

  it("should log error on failure", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");
    await sync({ projectId: "invalid" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Error"));
  });
});
```

**Example - After**:
```typescript
// ✅ GOOD: 测试功能，不测试日志
describe("sync command", () => {
  it("should sync project successfully", async () => {
    const result = await sync({ projectId: "123" });
    expect(result.success).toBe(true);
    expect(result.filesSynced).toBeGreaterThan(0);
  });
});
```

**受影响文件 (5个 CLI Tests)**:
1. `turbo/apps/cli/src/__tests__/pull.test.ts` - 删除console测试
2. `turbo/apps/cli/src/__tests__/push-multiple-blobs.test.ts` - 删除console测试
3. `turbo/apps/cli/src/commands/__tests__/sync.test.ts` - 删除console测试

**删除规则**:
- ❌ 删除所有 `vi.spyOn(console, "log")` 测试
- ❌ 删除所有 `vi.spyOn(console, "error")` 测试
- ❌ 删除所有测试具体error message的测试
- ✅ 保留测试返回值和副作用的测试

---

### ❌ 类型9: 测试空状态和边界 - 删除100%

**问题**: 测试empty state, loading state, error state

**Example - Before**:
```typescript
// ❌ BAD: 测试各种状态
describe("ProjectList", () => {
  it("should show loading state", () => {
    render(<ProjectList loading={true} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show empty state", () => {
    render(<ProjectList projects={[]} />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("should show error state", () => {
    render(<ProjectList error="Failed to load" />);
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("should show projects", () => {
    render(<ProjectList projects={[{ name: "Test" }]} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

**Example - After**:
```typescript
// ✅ GOOD: 只测试核心功能
describe("ProjectList", () => {
  it("should display projects", () => {
    render(<ProjectList projects={[{ name: "Project 1" }, { name: "Project 2" }]} />);
    expect(screen.getByText("Project 1")).toBeInTheDocument();
    expect(screen.getByText("Project 2")).toBeInTheDocument();
  });

  it("should allow selecting projects", () => {
    const onSelect = vi.fn();
    render(<ProjectList projects={[{ name: "Test" }]} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Test"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Test" }));
  });
});
```

**受影响文件**: 所有Component和Page测试（约15个）

**删除规则**:
- ❌ 删除所有 `loading` state 测试
- ❌ 删除所有 `empty` state 测试
- ❌ 删除所有 `error` state 测试
- ❌ 删除所有 `fallback` 测试
- ✅ 保留核心渲染和交互测试

---

## Phase 3: 轻微调整

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

  it("should reject with error", async () => {
    const promise = new SignalPromise<number>();
    promise.reject(new Error("test"));
    await expect(promise).rejects.toThrow("test");
  });
});

// ✅ GOOD: E2E tests - 测试真实用户流程
describe("Basic smoke tests", () => {
  it("should load homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  it("should complete sign-in flow", async ({ page }) => {
    await page.goto("/sign-in");
    // 真实用户流程
  });
});

// ✅ GOOD: Core tests - 测试核心功能
describe("BlobFactory", () => {
  it("should create Vercel blob storage when token provided", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    const storage = BlobFactory.create();
    expect(storage).toBeInstanceOf(VercelBlobStorage);
  });

  it("should create memory storage when no token", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const storage = BlobFactory.create();
    expect(storage).toBeInstanceOf(MemoryBlobStorage);
  });
});
```

**受影响文件 (21个 - 轻微调整)**:

**Workspace Tests (9个) - 保留90%**:
1. `turbo/packages/signals/__tests__/promise.test.ts` - 保留95%
2. `turbo/packages/signals/__tests__/route.test.ts` - 保留90%
3. `turbo/packages/signals/__tests__/utils.test.ts` - 保留90%
4. `turbo/packages/signals/__tests__/fetch.test.ts` - 保留85%
5. `turbo/packages/signals/external/__tests__/project.test.ts` - 保留90%
6. `turbo/packages/signals/external/__tests__/project-detail.test.ts` - 保留90%
7. `turbo/packages/views/project/__tests__/project-page.test.tsx` - 保留85%
8. `turbo/packages/views/workspace/__tests__/workspace.test.tsx` - 保留85%
9. `turbo/packages/custom-eslint/__tests__/rules.test.ts` - 保留90%

**E2E Tests (3个) - 保留85%**:
10. `turbo/apps/e2e/web/tests/basic-smoke.spec.ts` - 保留90%
11. `turbo/apps/e2e/web/tests/clerk-auth-flow.spec.ts` - 保留85%
12. `turbo/apps/e2e/web/tests/cli-token-management.spec.ts` - 保留80%

**Core Tests (10个) - 保留60-70%**:
13. `turbo/packages/core/blob/__tests__/factory.test.ts` - 删除异常测试
14. `turbo/packages/core/blob/__tests__/memory-blob-storage.test.ts` - 保留70%
15. `turbo/packages/core/blob/__tests__/vercel-blob-storage.test.ts` - 保留65%
16. `turbo/packages/core/blob/__tests__/utils.test.ts` - 保留70%
17. `turbo/packages/core/__tests__/contract-fetch.test.ts` - 保留65%
18. `turbo/packages/core/__tests__/contract-fetch-simple.test.ts` - 保留65%
19. `turbo/packages/core/contracts/__tests__/share.contract.test.ts` - 保留60%

**CLI Tests (1个) - 保留70%**:
20. `turbo/apps/cli/src/__tests__/fs.spec.ts` - 保留70%，删除边界测试

---

## 📊 重构统计总结

### 按Phase分类

| Phase | 文件数 | 删除率 | 操作 |
|-------|--------|--------|------|
| Phase 1: 立即删除/重写 | 8-14 | 80-100% | 删除或完全重写 |
| Phase 2: 大幅简化 | 40-45 | 60-70% | 删除过度测试 |
| Phase 3: 轻微调整 | 20-25 | 10-40% | 保留大部分 |
| **总计** | **74** | **60-65%** | |

### 按问题类型分类

| 类型 | 文件数 | 删除率 | 优先级 |
|------|--------|--------|--------|
| 1. 无意义测试 | 2 | 100% | P0 |
| 2. 复制代码 | 2 | 80% | P0 |
| 3. Fake组件 | 4-8 | 90%+ | P0 |
| 4. 异常测试 | 29 | 60-70% | P1 |
| 5. Schema测试 | 29 | 100% | P1 |
| 6. CSS测试 | 15 | 60-70% | P1 |
| 7. 过度Mock | 5 | 60-70% | P1 |
| 8. Console测试 | 3 | 100% | P2 |
| 9. 空状态测试 | 15 | 100% | P2 |
| 10. 高质量测试 | 21 | 10-20% | P3 |

---

## 🚀 执行步骤

### Step 1: 备份现有测试
```bash
git checkout -b refactor/cleanup-tests
```

### Step 2: Phase 1 执行（1-2天）
```bash
# 删除无意义测试
rm turbo/apps/cli/src/__tests__/index.test.ts
rm turbo/apps/web/app/(authenticated)/components/use-session-polling.test.tsx

# 重写复制代码的测试
# 手动编辑这些文件，删除复制的代码，导入真实函数
# - turbo/apps/cli/src/__tests__/watch-claude.test.ts
# - turbo/apps/web/app/(authenticated)/settings/tokens/actions.test.ts

# 检查并处理fake组件测试
# 需要先确认哪些是fake组件
```

### Step 3: Phase 2 执行（3-5天）
```bash
# 批量处理API tests
# 删除所有401/404/400/schema测试

# 批量处理Component tests
# 删除所有CSS/emoji/console测试

# 批量处理Library tests
# 简化过度mock
```

### Step 4: Phase 3 执行（1天）
```bash
# 轻微调整高质量测试
# 删除少量边界测试
```

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

### Phase 1 Checklist
- [ ] 删除 `cli/index.test.ts`
- [ ] 删除 `use-session-polling.test.tsx`
- [ ] 重写 `watch-claude.test.ts`
- [ ] 重写 `settings/tokens/actions.test.ts`
- [ ] 确认fake组件测试（4-8个文件）
- [ ] 删除或重写fake组件测试

### Phase 2 Checklist
- [ ] 删除29个API tests中的异常测试
- [ ] 删除29个API tests中的schema测试
- [ ] 删除15个Component/UI tests中的CSS测试
- [ ] 删除5个Library tests中的过度mock
- [ ] 删除3个CLI tests中的console测试

### Phase 3 Checklist
- [ ] 调整21个高质量测试
- [ ] 删除少量边界测试
- [ ] 运行全部测试确保通过
- [ ] 提交代码

---

## 预期结果

- ✅ **测试文件数**: 74 → 74 (保留文件，但大幅精简内容)
- ✅ **测试数量**: ~800-1000 → ~350-400 (减少60-65%)
- ✅ **代码行数**: 减少60-65%
- ✅ **测试执行时间**: 减少50-60%
- ✅ **可维护性**: 显著提升
- ✅ **可信度**: 显著提升（删除假测试）
