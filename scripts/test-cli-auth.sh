#!/bin/bash

# CLI 认证自动化测试脚本

set -e

echo "🚀 开始 CLI 认证自动化测试..."

# 确保在正确的目录
cd "$(dirname "$0")/.."

# 检查是否安装了必要的依赖
if ! command -v uspark &> /dev/null; then
    echo "❌ 错误: 未找到 uspark 命令"
    echo "请先安装或构建 CLI: cd cli && go build -o uspark"
    exit 1
fi

# 进入 e2e/web 目录
cd e2e/web

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装测试依赖..."
    pnpm install
fi

# 运行 Playwright 测试
echo "🎭 运行 Playwright 自动化测试..."
npx playwright test cli-auth-automation.spec.ts --headed

echo "✅ CLI 认证自动化测试完成!"