# 本地 MCP Server 测试方案

这个文档描述如何在本地环境完整测试 MCP server 功能。

## 前提条件

- 本地开发环境已配置
- SSL 证书已生成
- 数据库连接正常
- Clerk 认证配置正确

## 测试流程

### 第 1 步：启动 Dev Server

使用 `/dev-start` 命令或手动启动：

```bash
# 方案 1: 使用命令
/dev-start

# 方案 2: 手动启动（前台运行，便于调试）
cd /workspaces/uspark3/turbo
pnpm dev
```

**验证：** 访问 https://www.uspark.dev:3000，确认服务正常运行

### 第 2 步：CLI 认证

构建并认证 CLI：

```bash
# 构建 CLI
cd /workspaces/uspark3/turbo
pnpm --filter @uspark/cli build

# 全局安装
cd apps/cli
pnpm link --global

# 认证到本地环境
export API_HOST=https://www.uspark.dev:3000
uspark auth login
```

**过程：**
1. CLI 会生成 device code 和 URL
2. 在浏览器中打开 URL
3. 登录并输入 device code
4. CLI 自动获取并保存 token 到 `~/.uspark/config.json`

**验证：**
```bash
# 检查认证状态
uspark auth whoami

# 查看配置文件
cat ~/.uspark/config.json
```

### 第 3 步：创建测试项目

**方案 A: 通过 Web UI 创建**

1. 访问 https://www.uspark.dev:3000
2. 登录（使用与 CLI 相同的账号）
3. 点击 "New Project" 创建项目
4. 记录项目 ID（从 URL 或项目设置中获取）

**方案 B: 通过 API 创建（推荐用于自动化）**

```bash
# 获取 token
TOKEN=$(cat ~/.uspark/config.json | jq -r '.token')

# 创建项目
curl -X POST https://www.uspark.dev:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MCP Test Project",
    "description": "Testing MCP server functionality"
  }'

# 记录返回的 project ID
```

### 第 4 步：准备测试文件

使用我们已经创建的测试文档：

```bash
# 查看测试文件
ls -la /workspaces/uspark3/test-docs/

# 文件列表：
# - README.md
# - feature-overview.md
# - api-guide.md
# - troubleshooting.md
```

### 第 5 步：使用 CLI Push 文件

```bash
# 设置项目 ID
export PROJECT_ID="<your-project-id>"

# 初始化项目目录
cd /workspaces/uspark3/test-docs

# Push 文件到项目
uspark push
# 或者指定项目 ID
uspark push --project $PROJECT_ID
```

**验证：**
```bash
# 列出项目文件
uspark list

# 查看某个文件
uspark pull README.md
```

### 第 6 步：配置 MCP Server

创建 MCP server 配置：

```bash
# 设置环境变量
export USPARK_TOKEN=$(cat ~/.uspark/config.json | jq -r '.token')
export USPARK_PROJECT_ID="<your-project-id>"
export USPARK_API_URL="https://www.uspark.dev:3000"
export USPARK_OUTPUT_DIR=".uspark-mcp-test"
export USPARK_SYNC_INTERVAL="3600000"  # 1 hour

# 验证配置
echo "Token: ${USPARK_TOKEN:0:20}..."
echo "Project: $USPARK_PROJECT_ID"
echo "API URL: $USPARK_API_URL"
```

### 第 7 步：测试 MCP Server（方案 A - 直接运行）

```bash
# 构建 MCP server
cd /workspaces/uspark3/turbo
pnpm --filter @uspark/mcp-server build

# 测试运行 MCP server
node packages/mcp-server/dist/index.js
```

**预期输出：**
```
uSpark MCP server running on stdio
Project ID: <project-id>
Output directory: .uspark-mcp-test
[timestamp] Starting sync...
[timestamp] Synced X files successfully
```

**验证同步的文件：**
```bash
ls -la .uspark-mcp-test/
# 应该看到 test-docs 中的文件
```

### 第 8 步：运行 E2E 测试（方案 B - 自动化测试）

```bash
# 进入测试目录
cd /workspaces/uspark3/e2e/mcp-server

# 安装依赖
npm ci

# 运行测试（会使用环境变量中的配置）
npm test
```

**预期结果：**
```
✓ MCP Server Integration Tests > Server Information > should connect successfully
✓ MCP Server Integration Tests > Tools > should list available tools
✓ MCP Server Integration Tests > Tools > should execute uspark_status tool
✓ MCP Server Integration Tests > Tools > should execute uspark_list_files tool
✓ MCP Server Integration Tests > Tools > should execute uspark_pull tool

Test Files  1 passed (1)
Tests  5 passed (5)
```

### 第 9 步：验证功能

**测试 uspark_status:**
- 应显示项目 ID、同步状态、文件数量

**测试 uspark_list_files:**
- 应列出所有 push 的文件
- 验证文件名、大小、修改时间

**测试 uspark_pull:**
- 从服务器拉取文件到本地
- 验证文件内容与原始文件一致

## 调试技巧

### 查看详细日志

```bash
# 启用 MCP server 调试日志
export DEBUG=uspark:*
export LOG_LEVEL=debug

# 运行测试
npm test
```

### 检查数据库状态

```bash
# 连接到本地数据库
psql $DATABASE_URL

# 查询项目
SELECT id, name FROM projects;

# 查询文件
SELECT * FROM files WHERE project_id = '<project-id>';
```

### 监控网络请求

```bash
# 使用 tcpdump 或 Chrome DevTools
# 查看 CLI/MCP server 与 API 的通信
```

## 常见问题

### Q: CLI 认证失败
**A:** 检查：
- Dev server 是否运行
- API_HOST 环境变量是否正确
- Clerk 配置是否正确
- SSL 证书是否有效

### Q: MCP server 无法同步
**A:** 检查：
- Token 是否有效
- Project ID 是否正确
- API URL 是否可访问
- 网络连接是否正常

### Q: E2E 测试失败
**A:** 检查：
- 环境变量是否正确设置
- MCP server 是否成功构建
- 项目中是否有文件
- Token 权限是否足够

## 清理环境

测试完成后清理：

```bash
# 删除测试项目（通过 Web UI）
# 或通过 API:
curl -X DELETE https://www.uspark.dev:3000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"

# 清理 MCP 同步目录
rm -rf .uspark-mcp-test

# 清理 CLI 配置（可选）
rm ~/.uspark/config.json
```

## 自动化脚本

完整的自动化测试脚本：

```bash
#!/bin/bash
set -e

# 配置
export API_HOST="https://www.uspark.dev:3000"
export USPARK_SYNC_INTERVAL="3600000"
export USPARK_OUTPUT_DIR=".uspark-mcp-test"

# 1. 构建 CLI
echo "📦 Building CLI..."
cd /workspaces/uspark3/turbo
pnpm --filter @uspark/cli build

# 2. 认证（假设已经完成）
echo "🔐 Checking authentication..."
if ! uspark auth whoami > /dev/null 2>&1; then
  echo "❌ Not authenticated. Please run: uspark auth login"
  exit 1
fi

# 3. 获取 token
export USPARK_TOKEN=$(cat ~/.uspark/config.json | jq -r '.token')

# 4. 创建项目
echo "📁 Creating test project..."
PROJECT_RESPONSE=$(curl -s -X POST $API_HOST/api/projects \
  -H "Authorization: Bearer $USPARK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"MCP Test","description":"Automated test"}')

export USPARK_PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.id')
echo "✅ Project created: $USPARK_PROJECT_ID"

# 5. Push 测试文件
echo "⬆️  Pushing test files..."
cd /workspaces/uspark3/test-docs
uspark push --project $USPARK_PROJECT_ID

# 6. 构建 MCP server
echo "🔨 Building MCP server..."
cd /workspaces/uspark3/turbo
pnpm --filter @uspark/mcp-server build

# 7. 运行测试
echo "🧪 Running MCP E2E tests..."
cd /workspaces/uspark3/e2e/mcp-server
export USPARK_API_URL=$API_HOST
npm test

echo "✅ All tests passed!"

# 8. 清理（可选）
# curl -X DELETE $API_HOST/api/projects/$USPARK_PROJECT_ID \
#   -H "Authorization: Bearer $USPARK_TOKEN"
```

保存为 `test-mcp-local.sh` 并执行：
```bash
chmod +x test-mcp-local.sh
./test-mcp-local.sh
```
