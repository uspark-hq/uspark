# E2B 到 Cloudflare Sandbox 迁移分析

## 执行摘要

本文档分析了从 E2B 迁移到 Cloudflare Sandbox 的可行性、优势、挑战和实施路径。

**核心结论**：Cloudflare Sandbox 是 E2B 的可行替代方案，但需要重大架构调整，主要因为 Cloudflare 采用了不同的部署模型（Worker-based）。

---

## 一、平台对比

### E2B (当前方案)

#### 架构特点
- **SDK 类型**：传统 SDK，从任何 Node.js 环境调用
- **沙箱模型**：独立的容器实例，通过 API 远程控制
- **部署位置**：在我们的 Next.js 应用中直接调用
- **状态管理**：通过沙箱 ID 和元数据进行会话关联

#### 当前使用方式
```typescript
// 从 Next.js API route 直接调用
const sandbox = await Sandbox.create(TEMPLATE_ID, {
  timeoutMs: 1800000,
  metadata: { sessionId, projectId, userId },
  envs: { /* ... */ }
});

await sandbox.commands.run(command);
```

#### 优势
- ✅ 简单集成：直接在现有代码中调用
- ✅ 灵活性：可从任何服务器环境使用
- ✅ 成熟的 SDK：功能完整
- ✅ 会话重用：支持沙箱重连

#### 劣势
- ❌ 成本较高：专有平台
- ❌ 供应商锁定：依赖 E2B 基础设施
- ❌ 文档较少：相对较新的服务

### Cloudflare Sandbox (备选方案)

#### 架构特点
- **SDK 类型**：**必须在 Cloudflare Workers 内运行**
- **沙箱模型**：基于 Cloudflare Containers + Durable Objects
- **部署位置**：需要部署专用的 Cloudflare Worker
- **状态管理**：通过 Durable Objects 持久化

#### 必需架构
```typescript
// 必须部署为 Cloudflare Worker
// 不能从 Next.js 直接调用
export default {
  async fetch(request, env) {
    const sandbox = getSandbox(env.Sandbox, userId);
    const result = await sandbox.exec(command);
    return Response.json(result);
  }
}
```

#### 优势
- ✅ 成本优化：基于实际使用量计费，可能更便宜
- ✅ Cloudflare 生态：与 Workers/DO 深度集成
- ✅ 全球分发：利用 Cloudflare 边缘网络
- ✅ 强大的 API：丰富的命令、文件、会话管理
- ✅ 灵活的实例类型：6 种配置（lite 到 standard-4）

#### 劣势
- ❌ **架构变更**：需要引入 Cloudflare Workers 层
- ❌ Beta 阶段：服务仍在发展中
- ❌ 部署复杂性：需要管理额外的基础设施
- ❌ 学习曲线：需要理解 Workers + DO + Containers

---

## 二、核心差异与挑战

### 1. 部署模型差异 ⚠️ **最大挑战**

#### E2B：直接集成
```
Next.js API Route → E2B SDK → E2B Container
```

#### Cloudflare：间接集成
```
Next.js API Route → HTTP Request → Cloudflare Worker → Sandbox
                                         ↓
                                  Durable Object (状态)
                                         ↓
                                  Container (执行)
```

**影响**：
- 需要部署和维护一个新的 Cloudflare Worker 项目
- Next.js 应用通过 HTTP API 与 Worker 通信
- 增加了一层网络延迟
- 需要处理 Worker 的认证和授权

### 2. API 差异

#### 命令执行

**E2B**:
```typescript
const result = await sandbox.commands.run(command, {
  onStdout: (data) => console.log(data),
  onStderr: (data) => console.error(data),
  timeoutMs: 0,
  background: true
});
```

**Cloudflare**:
```typescript
// 方式1: 同步执行
const result = await sandbox.exec(command, {
  onOutput: (data) => console.log(data)
});

// 方式2: 流式执行
const stream = await sandbox.execStream(command);
for await (const event of stream) {
  if (event.type === 'stdout') console.log(event.data);
}

// 方式3: 后台进程
const process = await sandbox.startProcess(command);
const logs = await sandbox.streamProcessLogs(process.id);
```

**差异分析**：
- ✅ Cloudflare 提供了更丰富的执行模式
- ✅ 支持 SSE 流式传输（`execStream`）
- ✅ 更好的后台进程管理
- ⚠️ API 不兼容，需要重写所有调用

#### 文件操作

**E2B**:
```typescript
await sandbox.files.write(path, content);
const content = await sandbox.files.read(path);
```

**Cloudflare**:
```typescript
await sandbox.writeFile(path, content, { encoding: 'utf-8' });
const { data, encoding } = await sandbox.readFile(path);
```

**差异分析**：
- ✅ 功能相似，迁移相对简单
- ✅ Cloudflare 提供更多文件管理方法（mkdir, move, rename, delete）
- ✅ 支持 Git 操作（gitCheckout）

#### 会话管理

**E2B**:
```typescript
// 通过元数据查找现有沙箱
const sandboxes = await Sandbox.list();
const existing = sandboxes.find(s => s.metadata.sessionId === sessionId);
if (existing) {
  sandbox = await Sandbox.connect(existing.sandboxId);
}
```

**Cloudflare**:
```typescript
// 通过 Durable Object ID 自动管理状态
const sandbox = getSandbox(env.Sandbox, sessionId); // 自动重用
```

**差异分析**：
- ✅ Cloudflare 的状态管理更简单（Durable Objects 自动处理）
- ✅ 无需手动查找和重连
- ⚠️ 需要理解 Durable Objects 生命周期

### 3. 资源限制对比

| 项目 | E2B | Cloudflare (Beta) |
|------|-----|-------------------|
| **实例类型** | 固定配置 | 6种可选（lite ~ standard-4） |
| **最大内存** | 不公开 | 12 GiB (standard-4) |
| **最大 vCPU** | 不公开 | 4 vCPU (standard-4) |
| **磁盘空间** | 不公开 | 20 GB (standard-4) |
| **并发限制** | 不公开 | 400 GiB 内存 / 100 vCPU |
| **超时控制** | 灵活 | 取决于 Worker 超时 |

### 4. 成本对比

#### E2B 定价
- 未公开详细定价
- 可能采用订阅或固定配额模式

#### Cloudflare 定价
**基础费用**：
- Workers Paid 计划：$5/月

**使用费用**（超出免费额度）：
- vCPU: $0.000020/vCPU-秒 (免费: 375 vCPU-分钟/月)
- 内存: $0.0000025/GiB-秒 (免费: 25 GiB-小时/月)
- 磁盘: $0.00000007/GB-秒 (免费: 200 GB-小时/月)
- 网络: $0.025/GB (免费: 1TB/月，北美/欧洲)

**示例计算**（single Claude 执行，10分钟，standard-2 实例）：
- vCPU: 1 vCPU × 600秒 × $0.000020 = $0.012
- 内存: 6 GiB × 600秒 × $0.0000025 = $0.009
- 磁盘: 12 GB × 600秒 × $0.00000007 = $0.0005
- **总计**: ~$0.022 per execution

**优势**：
- ✅ 只为实际使用付费
- ✅ 免费额度可能覆盖开发/测试
- ✅ 可根据负载选择实例类型

---

## 三、迁移路径

### 选项 A：完全迁移（推荐用于长期）

#### 架构设计

```
┌─────────────────┐
│   Next.js App   │
│  (Vercel)       │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────────────────────────────┐
│      Cloudflare Worker                  │
│  ┌───────────────────────────────────┐  │
│  │  Sandbox Execution Endpoints      │  │
│  │  - POST /execute                  │  │
│  │  - GET  /status/:turnId           │  │
│  │  - POST /interrupt/:turnId        │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│              ▼                           │
│  ┌───────────────────────────────────┐  │
│  │  Durable Objects (State)          │  │
│  │  - Session management             │  │
│  │  - Execution tracking             │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│              ▼                           │
│  ┌───────────────────────────────────┐  │
│  │  Sandbox Container                │  │
│  │  - Claude CLI execution           │  │
│  │  - uspark sync                    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

#### 实施步骤

##### Phase 1: Worker 基础设施
1. **创建 Cloudflare Worker 项目**
   ```bash
   npm create cloudflare@latest cloudflare-sandbox-worker
   cd cloudflare-sandbox-worker
   ```

2. **配置 wrangler.jsonc**
   ```jsonc
   {
     "name": "uspark-sandbox",
     "main": "src/index.ts",
     "compatibility_date": "2024-01-01",
     "durable_objects": {
       "bindings": [
         {
           "name": "Sandbox",
           "class_name": "SandboxDurableObject",
           "script_name": "@cloudflare/sandbox"
         }
       ]
     },
     "containers": {
       "bindings": [
         {
           "name": "SANDBOX_RUNTIME",
           "image": "ghcr.io/cloudflare/sandbox-runtime:latest"
         }
       ]
     }
   }
   ```

3. **构建自定义容器镜像**
   ```dockerfile
   FROM ghcr.io/cloudflare/sandbox-runtime:latest

   # 安装 Node.js 和 npm
   RUN apt-get update && apt-get install -y \
       nodejs \
       npm \
       curl \
       git

   # 安装 Claude CLI
   RUN npm install -g @anthropic-ai/claude-code

   # 安装 uspark CLI
   RUN npm install -g @uspark/cli

   # 设置工作目录
   RUN mkdir -p /root/workspace
   WORKDIR /root/workspace
   ```

##### Phase 2: Worker API 实现

```typescript
// src/index.ts
import { getSandbox } from '@cloudflare/sandbox';

interface Env {
  Sandbox: DurableObjectNamespace;
  DATABASE_URL: string;
  CLAUDE_OAUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 路由处理
    if (url.pathname === '/execute' && request.method === 'POST') {
      return handleExecute(request, env);
    }

    if (url.pathname.startsWith('/status/')) {
      return handleStatus(request, env);
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleExecute(request: Request, env: Env) {
  const body = await request.json();
  const { sessionId, projectId, turnId, userId, prompt, extraEnvs } = body;

  // 获取或创建沙箱（Durable Object 自动管理状态）
  const sandbox = getSandbox(env.Sandbox, sessionId);

  // 初始化环境变量
  await sandbox.setEnvVars({
    PROJECT_ID: projectId,
    USPARK_TOKEN: await generateToken(userId, sessionId),
    CLAUDE_CODE_OAUTH_TOKEN: await getClaudeToken(userId, env),
    ...extraEnvs
  });

  // 初始化项目文件（首次）
  const initResult = await sandbox.exec(
    `cd ~/workspace && uspark pull --all --project-id "${projectId}"`
  );

  if (initResult.exitCode !== 0) {
    return Response.json({
      error: 'Initialization failed',
      details: initResult.stderr
    }, { status: 500 });
  }

  // 创建临时 prompt 文件
  const promptPath = `/tmp/prompt_${Date.now()}.txt`;
  await sandbox.writeFile(promptPath, prompt);

  // 启动后台 Claude 执行
  const command = `cd ~/workspace && cat "${promptPath}" | claude --print --verbose --output-format stream-json | uspark watch-claude --project-id ${projectId} --turn-id ${turnId} --session-id ${sessionId}`;

  const process = await sandbox.startProcess(command, {
    cwd: '/root/workspace'
  });

  // 清理 prompt 文件
  await sandbox.deleteFile(promptPath);

  return Response.json({
    success: true,
    processId: process.id,
    turnId
  });
}

async function handleStatus(request: Request, env: Env) {
  const url = new URL(request.url);
  const turnId = url.pathname.split('/')[2];

  // 从数据库查询状态（保持现有逻辑）
  // ...

  return Response.json({ status: 'in_progress' });
}
```

##### Phase 3: Next.js 集成

```typescript
// turbo/apps/web/src/lib/cloudflare-executor.ts
export class CloudflareExecutor {
  private static readonly WORKER_URL = process.env.CLOUDFLARE_WORKER_URL!;

  static async execute(
    turnId: string,
    sessionId: string,
    projectId: string,
    userPrompt: string,
    userId: string,
    extraEnvs?: Record<string, string>
  ): Promise<void> {
    const response = await fetch(`${this.WORKER_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        sessionId,
        projectId,
        turnId,
        userId,
        prompt: userPrompt,
        extraEnvs
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Execution failed: ${error.details}`);
    }

    const result = await response.json();
    console.log(`Turn ${turnId} started with process ${result.processId}`);
  }
}
```

```typescript
// turbo/apps/web/src/lib/claude-executor.ts
import { CloudflareExecutor } from './cloudflare-executor';

export class ClaudeExecutor {
  static async execute(
    turnId: string,
    sessionId: string,
    projectId: string,
    userPrompt: string,
    userId: string,
    extraEnvs?: Record<string, string>
  ): Promise<void> {
    // 替换 E2BExecutor 为 CloudflareExecutor
    await CloudflareExecutor.execute(
      turnId,
      sessionId,
      projectId,
      userPrompt,
      userId,
      extraEnvs
    );
  }
}
```

##### Phase 4: 部署和验证

1. **部署 Worker**
   ```bash
   cd cloudflare-sandbox-worker
   wrangler deploy
   ```

2. **配置环境变量**
   ```bash
   # Next.js
   CLOUDFLARE_WORKER_URL=https://uspark-sandbox.workers.dev
   WORKER_AUTH_TOKEN=<secure-token>
   ```

3. **测试执行流程**
   - 创建测试会话
   - 提交 Claude 执行请求
   - 验证日志和输出
   - 检查文件同步

### 选项 B：混合方案（快速验证）

保持 E2B 用于生产，使用 Cloudflare Sandbox 进行 POC：

```typescript
export class ClaudeExecutor {
  static async execute(...args) {
    const useCloudflare = process.env.USE_CLOUDFLARE_SANDBOX === 'true';

    if (useCloudflare) {
      return CloudflareExecutor.execute(...args);
    } else {
      return E2BExecutor.execute(...args);
    }
  }
}
```

**优势**：
- ✅ 低风险验证
- ✅ 可以 A/B 测试
- ✅ 逐步迁移

**劣势**：
- ❌ 维护两套代码
- ❌ 增加复杂性

### 选项 C：保持 E2B（如果满意）

**考虑保持 E2B 的情况**：
- ✅ 当前方案运行稳定
- ✅ 成本可接受
- ✅ 不想增加基础设施复杂度
- ✅ 团队不熟悉 Cloudflare 生态

---

## 四、技术风险评估

### 高风险 🔴

1. **架构复杂性增加**
   - 引入新的基础设施层（Worker + DO）
   - 增加故障点
   - **缓解**：完善的监控和日志

2. **Beta 阶段稳定性**
   - Cloudflare Sandbox 仍在 Beta
   - API 可能变更
   - **缓解**：密切关注更新，保持兼容性

### 中风险 🟡

1. **网络延迟**
   - Next.js → Worker 增加一次网络调用
   - **缓解**：利用 Cloudflare 边缘网络，选择合适的区域

2. **调试复杂度**
   - 跨多个系统调试（Next.js + Worker + Sandbox）
   - **缓解**：完善的日志聚合，使用 Workers Logs

### 低风险 🟢

1. **成本超支**
   - 使用量计费可预测
   - **缓解**：设置预算告警，选择合适的实例类型

---

## 五、建议和后续步骤

### 短期建议（1-2 周）

1. **POC 验证**
   - [ ] 创建简单的 Cloudflare Worker
   - [ ] 测试 Sandbox 基本功能（exec, files）
   - [ ] 验证 Claude CLI 在 Cloudflare 容器中的运行
   - [ ] 测试 uspark CLI 集成

2. **成本分析**
   - [ ] 估算当前 E2B 使用量
   - [ ] 计算 Cloudflare 等效成本
   - [ ] 对比 ROI

### 中期建议（1-2 月）

如果 POC 成功：

1. **完整实现**
   - [ ] 构建生产级 Worker API
   - [ ] 实现完整的错误处理和重试
   - [ ] 添加监控和告警
   - [ ] 编写集成测试

2. **灰度发布**
   - [ ] 10% 流量到 Cloudflare
   - [ ] 监控错误率和性能
   - [ ] 收集用户反馈

### 长期建议（3+ 月）

如果迁移成功：

1. **优化和扩展**
   - [ ] 性能优化（缓存、预热）
   - [ ] 成本优化（实例类型调整）
   - [ ] 功能增强（利用 Cloudflare 独特功能）

2. **弃用 E2B**
   - [ ] 100% 流量迁移
   - [ ] 移除 E2B 依赖
   - [ ] 更新文档

---

## 六、关键决策点

### ✅ 推荐迁移的情况：

1. **成本敏感**：Cloudflare 的使用量计费可能更经济
2. **已使用 Cloudflare**：如果已经在使用 Workers/Pages，集成更顺畅
3. **需要灵活性**：6 种实例类型可根据负载调整
4. **长期投资**：愿意投入时间学习和优化

### ❌ 不推荐迁移的情况：

1. **时间紧迫**：没有资源进行大规模重构
2. **E2B 满意**：当前方案已满足需求
3. **团队能力**：团队不熟悉 Cloudflare 生态
4. **风险厌恶**：不想承担 Beta 服务的风险

---

## 七、结论

**Cloudflare Sandbox 是技术上可行的替代方案**，但迁移需要：

1. **架构重构**：引入 Cloudflare Worker 中间层
2. **代码重写**：API 不兼容，需要重新实现执行逻辑
3. **基础设施管理**：额外的部署和运维工作
4. **团队学习**：掌握 Workers + Durable Objects + Containers

**权衡建议**：

- **如果优先考虑成本和灵活性** → 投资迁移到 Cloudflare
- **如果优先考虑稳定性和简单性** → 保持 E2B
- **如果不确定** → 先做小规模 POC，用数据驱动决策

**我的推荐**：

鉴于 Cloudflare Sandbox 仍处于 Beta 阶段，且迁移需要显著的架构变更，建议：

1. **立即行动**：启动 POC 项目验证技术可行性
2. **持续评估**：跟踪 Cloudflare Sandbox 的稳定性和功能演进
3. **条件决策**：
   - 如果 POC 成功 + 成本节省明显 → 计划迁移
   - 如果发现重大问题或成本相近 → 保持 E2B

**下一步行动**：创建 POC 任务列表和时间表
