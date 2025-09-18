# Claude执行实现方案

## 概述

本文档详细说明了如何实现Claude在E2B容器中的执行，包括具体的代码实现、配置步骤和集成方案。

## 实现步骤

### 1. 完善E2B容器配置

#### 1.1 更新Dockerfile

修改 `e2b/Dockerfile`，添加uspark CLI和初始化脚本：

```dockerfile
FROM node:22-slim

# 安装基础工具
RUN apt-get update && apt-get install -y git curl

# 安装Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# 安装uspark CLI ⬅️ 关键新增
RUN npm install -g @uspark/cli

# 创建工作目录
WORKDIR /workspace

# 添加初始化脚本
COPY init.sh /usr/local/bin/init.sh
RUN chmod +x /usr/local/bin/init.sh

# 设置入口点
ENTRYPOINT ["/usr/local/bin/init.sh"]
```

#### 1.2 创建容器初始化脚本

创建 `e2b/init.sh`：

```bash
#!/bin/bash
set -e

# 验证必需的环境变量
if [ -z "$PROJECT_ID" ] || [ -z "$USPARK_TOKEN" ]; then
  echo "Error: PROJECT_ID and USPARK_TOKEN required"
  exit 1
fi

# 拉取项目文件
echo "Pulling project files..."
uspark pull --project-id $PROJECT_ID

# 保持容器运行，等待命令
exec "$@"
```

#### 1.3 配置环境变量传递

更新 `e2b.toml`：

```toml
[runtime]
dockerfile = "e2b.Dockerfile"

[env]
USPARK_TOKEN = "${USPARK_TOKEN}"
PROJECT_ID = "${PROJECT_ID}"
CLAUDE_API_KEY = "${CLAUDE_API_KEY}"
```

### 2. 实现ClaudeExecutor类

创建 `turbo/apps/web/src/lib/claude-executor.ts`：

```typescript
import { Sandbox } from '@e2b/sdk';
import { generateId } from './utils';

interface ClaudeEvent {
  type: 'thinking' | 'content' | 'tool_use' | 'tool_result';
  data: any;
}

export class ClaudeExecutor {
  private sandbox: Sandbox | null = null;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async initialize() {
    this.sandbox = await Sandbox.create({
      template: 'w6qe4mwx23icyuytq64y', // E2B template ID
      timeout: 300, // 5分钟超时
      env: {
        PROJECT_ID: this.projectId,
        USPARK_TOKEN: process.env.USPARK_TOKEN!,
        CLAUDE_API_KEY: await this.getClaudeApiKey()
      }
    });

    // 等待容器初始化完成
    await this.waitForInitialization();
  }

  private async waitForInitialization() {
    if (!this.sandbox) throw new Error('Sandbox not initialized');

    // 检查文件是否同步完成
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.sandbox.exec('ls /workspace');
      if (result.stdout && result.stdout.trim()) {
        console.log('Container initialized successfully');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Container initialization timeout');
  }

  async execute(prompt: string): AsyncGenerator<ClaudeEvent> {
    if (!this.sandbox) throw new Error('Not initialized');

    // 执行Claude命令，通过watch-claude监听
    const proc = await this.sandbox.exec(
      `claude --dangerously-skip-permissions --output-json --prompt "${prompt}" | uspark watch-claude --project-id ${this.projectId}`,
      { stream: true }
    );

    // 流式读取输出
    for await (const chunk of proc.stdout) {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            yield this.parseClaudeEvent(event);
          } catch (e) {
            // 非JSON行，可能是普通日志
            console.log('Claude output:', line);
          }
        }
      }
    }
  }

  private parseClaudeEvent(rawEvent: any): ClaudeEvent {
    // 根据Claude的输出格式解析事件
    if (rawEvent.type === 'thinking') {
      return {
        type: 'thinking',
        data: { text: rawEvent.content }
      };
    } else if (rawEvent.type === 'content') {
      return {
        type: 'content',
        data: { text: rawEvent.content }
      };
    } else if (rawEvent.type === 'tool_use') {
      return {
        type: 'tool_use',
        data: {
          tool_name: rawEvent.tool_name,
          parameters: rawEvent.parameters,
          tool_use_id: rawEvent.tool_use_id
        }
      };
    } else if (rawEvent.type === 'tool_result') {
      return {
        type: 'tool_result',
        data: {
          tool_use_id: rawEvent.tool_use_id,
          result: rawEvent.result,
          error: rawEvent.error
        }
      };
    }

    throw new Error(`Unknown event type: ${rawEvent.type}`);
  }

  private async getClaudeApiKey(): Promise<string> {
    // 优先级：环境变量 > AWS Bedrock > 用户密钥
    if (process.env.CLAUDE_API_KEY) {
      return process.env.CLAUDE_API_KEY;
    }

    // TODO: 实现AWS Bedrock STS token生成
    // TODO: 实现用户密钥获取

    throw new Error('No Claude API key configured');
  }

  async cleanup() {
    if (this.sandbox) {
      await this.sandbox.close();
      this.sandbox = null;
    }
  }
}
```

### 3. 实现Claude执行API

更新 `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/turns/route.ts`：

在现有的POST函数后添加异步执行函数：

```typescript
import { ClaudeExecutor } from '@/lib/claude-executor';
import { parseEventToBlock } from '@/lib/claude-parser';

// 在POST函数中，创建Turn后添加：
// 触发异步Claude执行
executeClaudeAsync(turnId, projectId, user_message)
  .catch(error => {
    console.error('Claude execution failed:', error);
    // 错误会在executeClaudeAsync中记录到数据库
  });

// 新增异步执行函数
async function executeClaudeAsync(
  turnId: string,
  projectId: string,
  prompt: string
) {
  const executor = new ClaudeExecutor(projectId);

  try {
    // 更新状态为运行中
    await globalThis.services.db
      .update(TURNS_TBL)
      .set({
        status: 'in_progress',
        startedAt: new Date()
      })
      .where(eq(TURNS_TBL.id, turnId));

    // 初始化E2B容器
    await executor.initialize();

    // 执行并收集blocks
    let sequenceNumber = 0;
    for await (const event of executor.execute(prompt)) {
      const block = parseEventToBlock(event);

      // 实时保存block到数据库
      await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: generateId('block'),
          turnId,
          type: block.type,
          content: block.content,
          sequenceNumber: sequenceNumber++
        });
    }

    // 标记完成
    await globalThis.services.db
      .update(TURNS_TBL)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(TURNS_TBL.id, turnId));

  } catch (error: any) {
    // 标记失败
    await globalThis.services.db
      .update(TURNS_TBL)
      .set({
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
        completedAt: new Date()
      })
      .where(eq(TURNS_TBL.id, turnId));

    throw error;
  } finally {
    await executor.cleanup();
  }
}
```

### 4. 实现Block解析器

创建 `turbo/apps/web/src/lib/claude-parser.ts`：

```typescript
import { generateId } from './utils';

interface ClaudeEvent {
  type: 'thinking' | 'content' | 'tool_use' | 'tool_result';
  data: any;
}

interface Block {
  type: string;
  content: any;
}

export function parseEventToBlock(event: ClaudeEvent): Block {
  switch (event.type) {
    case 'thinking':
      return {
        type: 'thinking',
        content: { text: event.data.text }
      };

    case 'content':
      return {
        type: 'content',
        content: { text: event.data.text }
      };

    case 'tool_use':
      return {
        type: 'tool_use',
        content: {
          tool_name: event.data.tool_name,
          parameters: event.data.parameters,
          tool_use_id: event.data.tool_use_id
        }
      };

    case 'tool_result':
      return {
        type: 'tool_result',
        content: {
          tool_use_id: event.data.tool_use_id,
          result: event.data.result,
          error: event.data.error
        }
      };

    default:
      throw new Error(`Unknown event type: ${(event as any).type}`);
  }
}
```

### 5. API密钥管理

创建 `turbo/apps/web/src/lib/api-keys.ts`：

```typescript
export async function getClaudeApiKey(userId: string): Promise<string> {
  // 选项1：使用共享密钥
  if (process.env.CLAUDE_API_KEY) {
    return process.env.CLAUDE_API_KEY;
  }

  // 选项2：AWS Bedrock STS Token
  if (process.env.AWS_ACCESS_KEY_ID) {
    return await generateBedrockToken(userId);
  }

  // 选项3：用户自带密钥（未来功能）
  // const user = await db.users.findById(userId);
  // if (user?.claudeApiKey) {
  //   return decrypt(user.claudeApiKey);
  // }

  throw new Error('No Claude API key configured');
}

async function generateBedrockToken(userId: string): Promise<string> {
  // TODO: 实现AWS Bedrock STS token生成
  // 参考：https://docs.aws.amazon.com/bedrock/latest/userguide/api-setup.html
  throw new Error('Bedrock integration not yet implemented');
}
```

## 测试策略

### 1. Mock执行器（先实现）

创建 `turbo/apps/web/app/api/projects/[projectId]/sessions/[sessionId]/mock-execute/route.ts`：

```typescript
export async function POST(request: Request) {
  // 模拟Claude执行，用于测试
  const { prompt } = await request.json();

  // 创建Turn
  const turn = await createTurn(sessionId, prompt);

  // 模拟生成Blocks
  const mockBlocks = [
    { type: 'thinking', content: { text: '分析用户需求...' } },
    { type: 'content', content: { text: '理解了，我来帮您...' } },
    { type: 'tool_use', content: { tool_name: 'read_file', parameters: {} } },
    { type: 'tool_result', content: { result: 'File content...' } },
    { type: 'content', content: { text: '已完成任务。' } }
  ];

  for (const block of mockBlocks) {
    await createBlock(turn.id, block);
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 标记完成
  await updateTurnStatus(turn.id, 'completed');

  return Response.json({ turn_id: turn.id });
}
```

### 2. 集成测试脚本

创建 `scripts/test-claude-execution.ts`：

```typescript
async function testClaudeExecution() {
  // 1. 创建测试项目
  const project = await createTestProject();

  // 2. 创建会话
  const session = await createSession(project.id);

  // 3. 创建Turn（触发Claude执行）
  const turn = await createTurn(session.id, "Hello Claude");

  // 4. 轮询等待完成
  while (true) {
    const status = await getTurnStatus(turn.id);
    if (status === 'completed' || status === 'failed') {
      break;
    }
    await sleep(1000);
  }

  // 5. 获取并验证Blocks
  const blocks = await getTurnBlocks(turn.id);
  console.log('Execution completed with', blocks.length, 'blocks');
}
```

## 环境配置

### 必需的环境变量

```bash
# .env.local
E2B_API_TOKEN=your-e2b-token
USPARK_TOKEN=your-uspark-cli-token
CLAUDE_API_KEY=sk-ant-...  # 或使用AWS Bedrock配置

# 可选：AWS Bedrock配置
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-opus-20240229-v1:0
```

## 实现优先级

1. **Phase 1**: Mock执行器 - 验证整个流程
2. **Phase 2**: E2B容器配置 - 完善Dockerfile和初始化
3. **Phase 3**: ClaudeExecutor实现 - 真实Claude执行
4. **Phase 4**: 前端集成 - 连接聊天界面

## 注意事项

1. **安全性**：API密钥不应暴露给前端
2. **错误处理**：容器可能失败，需要重试机制
3. **资源管理**：确保容器正确清理，避免资源泄漏
4. **并发限制**：E2B可能有并发容器限制
5. **成本控制**：Claude API和E2B都有成本，需要监控使用量

## 相关文档

- [E2B运行时容器规范](./e2b-runtime-container.md)
- [Claude会话设计](./claude-sessions-design.md)
- [轮询系统设计](./polling-system.md)