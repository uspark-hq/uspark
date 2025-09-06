# Claude Sessions 系统设计

## 概述

基于文档中的需求，设计一个完整的 Claude 会话管理系统，包括 sessions、turns、blocks 三层结构。

## 数据模型

### 层级关系

```
Project (1) → Sessions (N) → Turns (N) → Blocks (N)
```

### 数据库 Schema

#### sessions 表

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

CREATE INDEX idx_sessions_project ON sessions(project_id);
CREATE INDEX idx_sessions_status ON sessions(status);
```

#### turns 表

```sql
CREATE TABLE turns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_turns_session ON turns(session_id);
CREATE INDEX idx_turns_status ON turns(status);
```

#### blocks 表

```sql
CREATE TABLE blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  turn_id TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- thinking, content, tool_use, tool_result
  content JSONB NOT NULL,
  sequence_number INTEGER NOT NULL, -- 块的顺序
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blocks_turn ON blocks(turn_id);
CREATE INDEX idx_blocks_sequence ON blocks(turn_id, sequence_number);
```

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

#### 创建新的对话轮次

```http
POST /api/projects/{projectId}/sessions/{sessionId}/turns
```

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
  "user_message": "用户输入的消息",
  "status": "pending",
  "created_at": "2025-01-06T10:00:00Z"
}
```

#### 更新 turn 状态

```http
PATCH /api/projects/{projectId}/sessions/{sessionId}/turns/{turnId}
```

请求体：

```json
{
  "status": "running" | "completed" | "failed",
  "error_message": "错误信息（失败时）"
}
```

### 3. Blocks 管理

#### 添加 block 到 turn

内部方法，没有外部 API

#### 批量添加 blocks

内部方法，没有外部 API

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
