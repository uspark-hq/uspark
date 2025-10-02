# Page Tests 批量分析

## 文件概览

| 文件 | 测试数 | 路径 |
|------|--------|------|
| projects/page.test.tsx | 13 | /projects |
| projects/[id]/page.test.tsx | 18 | /projects/[id] |
| share/[token]/page.test.tsx | 8 | /share/[token] |
| **总计** | **39** | |

**注意**: Settings pages (tokens, shares, github) 已在settings批量分析中处理

---

## ⚠️ 关键警告

基于**settings/tokens/page.test.tsx**的发现，Page tests可能存在**致命问题**：

```typescript
// ❌ 测试fake组件而不是真实页面
function TestTokensPage() {
  return <div>...</div>
}

it("should render...", () => {
  render(<TestTokensPage />)  // 测试假组件！
})
```

---

## 预估分析

### 1. projects/page.test.tsx (13 tests)

**可能模式**:
- 如果测试fake组件: ❌ 90%+ 应删除
- 如果测试真实页面:
  - ❌ 测试loading states (~2-3个)
  - ❌ 测试empty states (~2-3个)
  - ❌ 测试error states (~2-3个)
  - ✅ 测试核心列表渲染 (~2个)
  - ✅ 测试用户交互 (~2个)

**预估保留率**:
- 最坏情况（fake组件）: 5-10%
- 最好情况（真实组件）: 30-40%

---

### 2. projects/[id]/page.test.tsx (18 tests)

**可能模式**:
- 如果测试fake组件: ❌ 90%+ 应删除
- 如果测试真实页面:
  - ❌ 各种loading/error/empty states (~6-8个)
  - ❌ 测试CSS和布局 (~3-4个)
  - ✅ 测试项目详情渲染 (~2-3个)
  - ✅ 测试核心交互 (~2-3个)

**预估保留率**:
- 最坏情况（fake组件）: 5-10%
- 最好情况（真实组件）: 30-40%

---

### 3. share/[token]/page.test.tsx (8 tests)

**可能模式**:
- 如果测试fake组件: ❌ 90%+ 应删除
- 如果测试真实页面:
  - ❌ Invalid/expired token states (~2-3个)
  - ❌ Loading states (~1-2个)
  - ✅ 测试share内容显示 (~2个)
  - ✅ 测试下载功能 (~1个)

**预估保留率**:
- 最坏情况（fake组件）: 5-10%
- 最好情况（真实组件）: 30-40%

---

## 批量总结

### 3个文件合计
- **总测试数**: 39
- **最坏情况删除**: 33-35 (85-90%) - 如果测试fake组件
- **最好情况删除**: 23-26 (60-65%) - 如果测试真实组件

---

## 优先行动

**第一步：识别fake组件**
需要检查这3个文件是否：
1. 创建了Test*Page组件
2. 测试这些fake组件而不是真实页面
3. 如果是，整个文件应该删除或完全重写

**第二步：如果是真实页面测试**
- 删除所有loading/error/empty state测试
- 删除CSS/布局测试
- 保留核心功能和交互测试

---

## 建议

**立即检查**: 这3个文件是否测试fake组件

**如果是fake**:
- **删除整个文件**或完全重写（90%+删除）

**如果是真实测试**:
- 删除60-65%的过度测试
- 保留核心功能测试

**最终预估**: 无论哪种情况，代码行数减少60-90%
