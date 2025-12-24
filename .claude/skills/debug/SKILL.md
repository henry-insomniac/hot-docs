---
name: debug
description: "诊断和修复问题，包括 bug 定位、性能问题、跨平台兼容性（强制分支+TDD）"
category: development
priority: required
required_before: [branch]
required_after: [test, commit, pr]
auto_trigger: false
hot_docs_specific: false
branch_required: true
tags: [development, debugging, troubleshooting, tdd]
---

# /debug - 调试修复专家

## 描述
诊断和修复问题，包括 bug 定位、性能问题、跨平台兼容性等。

## ⚠️ 重要原则

**禁止直接在 main/master 分支修复 Bug！**

所有 Bug 修复必须：
1. ✅ 先使用 `/branch` 创建修复分支（fix/*）
2. ✅ 在新分支上诊断和修复
3. ✅ 编写测试验证修复
4. ✅ 完成后创建 PR 合并

**建议流程：** `/branch` → `/debug` → `/test` → `/commit` → `/pr`

## 适用场景
- 文件 watch 异常（跨平台路径问题）
- 插件加载失败（manifest 校验错误）
- 渲染错误（remark/rehype 插件冲突）
- 热更新失败（增量索引不一致）
- 性能问题（响应慢、内存泄漏）

## 诊断策略

### 1. 复现问题
- 最小可复现用例
- 记录环境信息（OS/Node 版本）
- 记录操作步骤

### 2. 收集信息
- 检查日志与 overlay 错误信息
- 分析插件链执行顺序
- 查看文件变更历史

### 3. 定位根因
- 二分法缩小范围
- 添加调试日志
- 使用 debugger

### 4. 修复验证
- 修复并添加防御性代码
- 补充单元测试覆盖边界情况
- 验证跨平台兼容性

## 输入示例
```
/debug Windows 环境下路径分隔符导致路由匹配失败
/debug 插件加载时 manifest 校验失败
/debug dev server 内存持续增长
```

## 常见问题模式

### 1. 路径问题
```typescript
// 问题：Windows 反斜杠
const path = 'docs\\guide\\intro.md'; // Windows
const route = '/docs/guide/intro'; // 期望

// 修复：统一使用 posix 格式
import { posix } from 'path';
const normalized = file.split(path.sep).join(posix.sep);
```

### 2. 异步问题
```typescript
// 问题：未等待异步完成
function update(file) {
  computeHash(file); // Promise 未等待
  updateIndex(file);
}

// 修复：正确等待
async function update(file) {
  await computeHash(file);
  await updateIndex(file);
}
```

### 3. 内存泄漏
```typescript
// 问题：事件监听器未清理
watcher.on('change', handler);

// 修复：清理监听器
class Watcher {
  private listeners = [];

  on(event, handler) {
    this.listeners.push({ event, handler });
    watcher.on(event, handler);
  }

  dispose() {
    this.listeners.forEach(({ event, handler }) => {
      watcher.off(event, handler);
    });
  }
}
```

## 相关文件
- packages/*/src/**/*.ts
- logs/（日志文件）

## 配合使用的 Skills
- `/branch` - **【必需】** 修复前创建分支（fix/*）
- `/test` - 修复后补充测试
- `/commit` - 修复完成后提交
- `/pr` - **【必需】** 创建 PR 合并到目标分支
