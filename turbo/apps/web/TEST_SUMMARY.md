# 测试方案和 Mock 总结

## 测试覆盖范围

### 1. useSessionPolling Hook 测试
**文件**: `src/hooks/__tests__/useSessionPolling.test.ts`

**测试内容**:
- ✅ 无 sessionId 时不轮询
- ✅ enabled 为 false 时不轮询
- ✅ 提供 sessionId 和 enabled 时开始轮询
- ✅ 运行中的会话每秒轮询一次
- ✅ 会话完成时停止轮询
- ✅ 会话失败时停止轮询
- ✅ 会话被中断时停止轮询
- ✅ 处理 fetch 错误
- ✅ 处理 HTTP 错误
- ✅ 调用 onUpdate 回调
- ✅ 支持手动刷新
- ✅ 支持中断会话
- ✅ 组件卸载时清理
- ✅ enabled 变为 false 时停止轮询

**Mock 内容**:
- `global.fetch`: 模拟 HTTP 请求
- `AbortSignal`: 模拟请求取消
- 使用 `vi.useFakeTimers()` 模拟时间流逝

### 2. SessionDisplay 组件测试
**文件**: `app/components/chat/__tests__/SessionDisplay.test.tsx`

**测试内容**:
- ✅ 空会话时显示空状态
- ✅ 显示会话 ID 和状态
- ✅ 运行中会话显示中断按钮
- ✅ 完成/失败的会话不显示中断按钮
- ✅ 显示所有 turns
- ✅ 空 turns 时显示提示信息
- ✅ 各状态的徽章颜色正确
- ✅ 中断按钮的悬停效果

**Mock 内容**:
- `mockSession`: 各种状态的会话数据
- `onInterrupt` 回调函数

### 3. BlockDisplay 组件测试
**文件**: `app/components/chat/__tests__/BlockDisplay.test.tsx`

**测试内容**:
- ✅ Thinking block 渲染和展开/折叠
- ✅ Tool Use block 显示正确的工具名和图标
- ✅ Text block 直接显示内容
- ✅ Error block 显示错误样式
- ✅ 未知 block 类型降级为文本显示
- ✅ 各类型 block 的背景色

**Mock 内容**:
- `mockBlock`: 生成各种类型的 block 数据
- 工具名到图标的映射

### 4. ChatStatus 组件测试
**文件**: `app/components/chat/__tests__/ChatStatus.test.tsx`

**测试内容**:
- ✅ 无会话时显示 "No Session"
- ✅ 各种会话状态的正确显示
- ✅ 运行中 turn 显示 block 计数
- ✅ 执行计时器功能
- ✅ 会话完成时停止计时器
- ✅ 时间格式化（秒/分钟）
- ✅ Turn 计数器
- ✅ 会话 ID 截断显示
- ✅ 状态指示器颜色
- ✅ 运行中会话的脉冲动画

**Mock 内容**:
- `mockSession`: 各种状态的会话
- `mockTurn`: 各种状态的 turn
- 使用 `vi.useFakeTimers()` 测试计时器

## Mock 数据结构

### 核心 Mock 工具
**文件**: `src/test/mocks/sessions.ts`

```typescript
// Block 生成器
mockBlock.thinking(turnId)      // 思考 block
mockBlock.toolUse(turnId, tool) // 工具使用 block
mockBlock.text(turnId, content) // 文本 block
mockBlock.error(turnId, msg)    // 错误 block

// Turn 生成器
mockTurn.running(sessionId, input)   // 运行中的 turn
mockTurn.completed(sessionId, input) // 完成的 turn
mockTurn.failed(sessionId, input)    // 失败的 turn

// Session 生成器
mockSession.idle(projectId)        // 空闲会话
mockSession.running(projectId)     // 运行中会话
mockSession.completed(projectId)   // 完成的会话
mockSession.failed(projectId)      // 失败的会话
mockSession.interrupted(projectId) // 被中断的会话

// 会话状态序列生成器
createMockSessionSequence(projectId) // 生成状态转换序列
```

## Mock 策略

### 1. HTTP 请求 Mock
- 使用 `vi.fn()` 创建 mock fetch 函数
- 返回符合 Response 接口的对象
- 模拟成功和失败场景

### 2. 时间相关 Mock
- 使用 `vi.useFakeTimers()` 控制时间
- `vi.advanceTimersByTime()` 推进时间
- 测试轮询间隔和执行时间计算

### 3. 回调函数 Mock
- 使用 `vi.fn()` 创建 spy 函数
- 验证调用次数和参数

### 4. 组件交互 Mock
- 使用 `@testing-library/react` 的事件模拟
- `fireEvent.click()` 模拟点击
- `fireEvent.mouseOver/Out()` 模拟悬停

## 测试运行命令

```bash
# 运行所有测试
pnpm vitest run

# 运行特定文件的测试
pnpm vitest run src/hooks/__tests__/useSessionPolling.test.ts

# 运行 chat 组件测试
pnpm vitest run app/components/chat

# 监听模式
pnpm vitest --watch

# 带覆盖率报告
pnpm vitest run --coverage
```

## 测试覆盖率

### 已测试
- ✅ useSessionPolling hook - 14 个测试用例
- ✅ SessionDisplay 组件 - 10 个测试用例
- ✅ BlockDisplay 组件 - 12 个测试用例
- ✅ ChatStatus 组件 - 20 个测试用例
- ✅ Mock 数据工具 - 完整覆盖

### 未测试（建议后续补充）
- ❌ TurnDisplay 组件
- ❌ Sessions API 客户端
- ❌ 集成测试（完整的用户流程）
- ❌ E2E 测试（真实的 API 调用）

## 关键 Mock 决策

1. **网络请求**: 完全 mock fetch，不进行真实网络调用
2. **时间控制**: 使用假计时器精确控制轮询和计时
3. **数据生成**: 使用工厂函数生成一致的测试数据
4. **状态转换**: 模拟真实的会话生命周期
5. **错误场景**: 覆盖网络错误、HTTP 错误、数据错误

## 测试原则

1. **隔离性**: 每个测试独立运行，不依赖其他测试
2. **可重复性**: 使用确定性的 mock 数据
3. **完整性**: 覆盖正常流程和异常流程
4. **可读性**: 清晰的测试描述和断言
5. **性能**: 使用 mock 避免真实 IO 操作