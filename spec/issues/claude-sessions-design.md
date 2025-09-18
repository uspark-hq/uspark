# Claude Sessions 系统设计

## 概述

基于文档中的需求，设计一个完整的 Claude 会话管理系统，包括 sessions、turns、blocks 三层结构。

## 数据模型

### 层级关系

```
Project (1) → Sessions (N) → Turns (N) → Blocks (N)
```

### 数据库 Schema ✅ COMPLETED

**Status**: Completed (Migration 0005_claude_sessions.sql, Schema in sessions.ts)

#### sessions 表 ✅

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sessions_project ON sessions(project_id);
```

#### turns 表 ✅

```sql
CREATE TABLE turns (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT, -- Error details if status is failed
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_turns_session ON turns(session_id);
CREATE INDEX idx_turns_status ON turns(status);
```

#### blocks 表 ✅

```sql
CREATE TABLE blocks (
  id TEXT PRIMARY KEY NOT NULL,
  turn_id TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- thinking, content, tool_use, tool_result
  content JSON NOT NULL, -- JSON content (auto-serialized by Drizzle)
  sequence_number INTEGER NOT NULL, -- Order of blocks within a turn
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_blocks_turn ON blocks(turn_id);
CREATE INDEX idx_blocks_sequence ON blocks(turn_id, sequence_number);
```

**Implementation Location**: `turbo/apps/web/src/db/schema/sessions.ts`
**Migration**: `turbo/apps/web/src/db/migrations/0005_claude_sessions.sql`

## API 接口设计

### 1. Sessions 管理

#### 创建会话

```http
POST /api/projects/{projectId}/sessions
```

请求体：

```json
{
  "title": "会话标题（可选）"
}
```

响应：

```json
{
  "id": "session-uuid",
  "project_id": "project-uuid",
  "title": "会话标题",
  "status": "active",
  "created_at": "2025-01-06T10:00:00Z"
}
```

#### 查询会话列表

```http
GET /api/projects/{projectId}/sessions
```

查询参数：

- `status`: active | interrupted | archived
- `limit`: 数量限制
- `offset`: 分页偏移

响应：

```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "title": "会话标题",
      "status": "active",
      "created_at": "2025-01-06T10:00:00Z"
    }
  ],
  "total": 100
}
```

#### 查询单个会话（仅基本信息）

```http
GET /api/projects/{projectId}/sessions/{sessionId}
```

响应：

```json
{
  "id": "session-uuid",
  "project_id": "project-uuid",
  "title": "会话标题",
  "created_at": "2025-01-06T10:00:00Z",
  "updated_at": "2025-01-06T10:30:00Z",
  "turn_ids": ["turn-uuid-1", "turn-uuid-2", "turn-uuid-3"]
}
```

#### 查询会话的 turns 列表

```http
GET /api/projects/{projectId}/sessions/{sessionId}/turns
```

查询参数：

- `limit`: 返回数量（默认 20）
- `offset`: 分页偏移

响应：

```json
{
  "turns": [
    {
      "id": "turn-uuid",
      "user_prompt": "用户输入的消息",
      "status": "completed",
      "started_at": "2025-01-06T10:00:00Z",
      "completed_at": "2025-01-06T10:00:30Z",
      "block_count": 4,
      "block_ids": ["block-1", "block-2", "block-3", "block-4"]
    }
  ],
  "total": 50
}
```

#### 查询单个 turn 的详细信息（包含 blocks）

```http
GET /api/projects/{projectId}/sessions/{sessionId}/turns/{turnId}
```

响应：

```json
{
  "id": "turn-uuid",
  "session_id": "session-uuid",
  "user_prompt": "用户输入的消息",
  "status": "completed",
  "started_at": "2025-01-06T10:00:00Z",
  "completed_at": "2025-01-06T10:00:30Z",
  "blocks": [
    {
      "id": "block-uuid",
      "type": "thinking",
      "content": {
        "text": "Claude的思考过程..."
      },
      "sequence_number": 0
    },
    {
      "id": "block-uuid-2",
      "type": "content",
      "content": {
        "text": "Claude的回复内容..."
      },
      "sequence_number": 1
    }
  ]
}
```

#### 中断会话

```http
POST /api/projects/{projectId}/sessions/{sessionId}/interrupt
```

响应：

```json
{
  "id": "session-uuid",
  "status": "interrupted"
}
```

### 2. Turns 管理

#### 创建新的对话轮次（调用 E2B 中的 Claude Code）

```http
POST /api/projects/{projectId}/sessions/{sessionId}/turns
```

**关键点**: 这个 API 是与 E2B 集成的核心接口
- 创建 Turn 记录（状态为 pending）
- **异步触发 E2B 容器中的 Claude Code 执行**
- 执行过程中自动：
  - 更新 Turn 状态（pending → running → completed/failed）
  - 实时插入 Claude 返回的 Blocks
  - 更新 Session 的 updatedAt 时间戳
- 立即返回 Turn ID 供前端轮询

请求体：

```json
{
  "user_message": "用户输入的消息"
}
```

响应：

```json
{
  "id": "turn-uuid",
  "session_id": "session-uuid",
  "user_prompt": "用户输入的消息",
  "status": "pending",
  "created_at": "2025-01-06T10:00:00Z"
}
```

**内部执行流程：**
1. API 创建 Turn 记录后立即返回
2. 后台任务启动 E2B 容器执行 Claude Code
3. 监听 Claude 输出流，实时：
   - 解析 thinking blocks → 插入数据库
   - 解析 content blocks → 插入数据库
   - 解析 tool_use/tool_result → 插入数据库
   - 更新 Turn 状态和时间戳
4. 前端通过轮询 API 获取实时更新

### 3. Blocks 管理

#### 重要说明：Blocks 和 Turn 状态更新为内部操作

**不需要实现以下 API：**
- ❌ `PATCH /api/projects/{projectId}/sessions/{sessionId}/turns/{turnId}` - 更新 turn 状态
- ❌ `POST /api/projects/{projectId}/sessions/{sessionId}/turns/{turnId}/blocks` - 添加 blocks

**原因：**
这两个操作应该在创建 Turn 后的 Claude Code 执行过程中自动完成：
1. 当 `POST /turns` 创建新 Turn 后，会自动触发 E2B 中的 Claude Code 执行
2. 执行过程中，系统内部会：
   - 自动更新 Turn 状态（pending → running → completed/failed）
   - 实时插入 Claude 返回的 Blocks（thinking、content、tool_use、tool_result）
3. 这些更新通过内部数据库操作完成，不需要暴露为外部 API

这样设计确保了：
- 数据一致性：状态和内容更新是原子性的
- 安全性：外部无法篡改执行过程中的状态
- 简洁性：减少不必要的 API 端点

### 4. 轮询接口

#### 获取会话更新（轻量级轮询）

```http
GET /api/projects/{projectId}/sessions/{sessionId}/updates
```

查询参数：

- `last_turn_index`: 客户端已有的最后一个 turn 索引
- `last_block_index`: 指定 turn 中最后一个 block 索引

响应：

```json
{
  "session": {
    "id": "session-uuid",
    "updated_at": "2025-01-06T10:30:00Z"
  },
  "new_turn_ids": ["turn-4", "turn-5"],
  "updated_turns": [
    {
      "id": "turn-3",
      "status": "completed",
      "new_block_ids": ["block-5", "block-6"],
      "block_count": 6
    }
  ],
  "has_active_turns": true
}
```

## Block 类型定义

### thinking block

```json
{
  "type": "thinking",
  "content": {
    "text": "Claude的思考过程文本"
  }
}
```

### content block

```json
{
  "type": "content",
  "content": {
    "text": "Claude的回复内容"
  }
}
```

### tool_use block

```json
{
  "type": "tool_use",
  "content": {
    "tool_name": "read_file",
    "parameters": {
      "path": "/path/to/file"
    },
    "tool_use_id": "unique-id"
  }
}
```

### tool_result block

```json
{
  "type": "tool_result",
  "content": {
    "tool_use_id": "unique-id",
    "result": "工具执行结果",
    "error": null
  }
}
```

## Frontend Implementation Requirements

### Required Components (需要重新实现)

#### 1. useSessionPolling Hook
- **Purpose**: 实时轮询会话状态更新
- **Features**:
  - 智能轮询频率管理（运行中每秒，完成后停止）
  - 增量更新支持（last_turn_index, last_block_index）
  - 错误处理和重试机制
  - 组件卸载时自动清理
- **API**: GET `/api/projects/{projectId}/sessions/{sessionId}/updates`

#### 2. SessionDisplay Component
- **Purpose**: 显示完整会话历史
- **Features**:
  - 显示所有turns列表
  - 实时更新新的turns
  - 滚动到最新消息
  - 加载状态指示

#### 3. TurnDisplay Component
- **Purpose**: 显示单个对话轮次
- **Features**:
  - 显示用户输入
  - 显示Claude响应
  - 状态指示（pending/running/completed/failed）
  - 执行时间显示

#### 4. BlockDisplay Component
- **Purpose**: 显示各种类型的内容块
- **Features**:
  - 支持thinking、content、tool_use、tool_result类型
  - 语法高亮（代码块）
  - 折叠/展开长内容
  - 工具调用可视化

#### 5. ChatStatus Component
- **Purpose**: 显示当前执行状态
- **Features**:
  - 运行状态指示器
  - 执行时间计数器
  - 错误消息显示
  - 中断按钮

### Mock Executor (测试工具)

#### Claude Mock Executor
- **Purpose**: 模拟Claude执行用于开发测试
- **Endpoint**: POST `/api/projects/{projectId}/sessions/{sessionId}/mock-execute`
- **Features**:
  - 模拟创建turns和blocks
  - 模拟延时和状态变化
  - 模拟文档修改（YJS更新）
  - 生成测试数据

### Integration Requirements

1. **Chat Interface Integration**:
   - 连接现有聊天输入UI与会话API
   - 实现消息发送和接收
   - 集成轮询hook更新显示

2. **Real-time Document Updates**:
   - 监听YJS文档变化
   - 同步更新文件浏览器
   - 显示修改标记
